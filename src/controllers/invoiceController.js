const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const Company = require('../models/Company');
const { getNextSequence } = require('../models/Sequence');

// Helper to round currency
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

// @desc    Create a new Tax Invoice
// @route   POST /api/invoices
// @access  Private/AdminOrExecutive
const createInvoice = asyncHandler(async (req, res) => {
    const {
        company,
        booking: bookingRef,
        bookingId,
        billTo,
        items,
        sacCode = '996601',
        salesLedger = 'Taxi Sales',
        gstMode = 'GST Extra',
        gstRate = 5,
        isInterState = false,
        advanceAdjusted = 0,
        invoiceDate,
        dueDate,
        termsAndConditions,
        notes,
        status = 'Issued',
        paymentDetails
    } = req.body;

    const companyId = company || req.user?.company;
    if (!companyId) {
        res.status(400);
        throw new Error('Company ID is required');
    }

    if (!billTo || !billTo.name || !billTo.mobile) {
        res.status(400);
        throw new Error('Bill To Name and Mobile Number are required');
    }

    if (!items || !items.length) {
        res.status(400);
        throw new Error('At least one invoice line item is required');
    }

    // 1. Generate sequential Tax Invoice Number (e.g. LK-INV-2026-00001)
    const invoiceNumber = await getNextSequence('LK-INV');

    // 2. Format line items & calculate base sum
    const formattedItems = items.map(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        const amount = item.amount !== undefined ? Number(item.amount) : (qty * rate);
        return {
            description: item.description || 'Passenger Transport Service',
            sacCode: item.sacCode || sacCode,
            quantity: qty,
            rate,
            amount: round2(amount)
        };
    });

    const itemSum = round2(formattedItems.reduce((acc, curr) => acc + curr.amount, 0));

    // 3. Dynamic GST Calculations (PRD Section 14)
    const rateNum = Number(gstRate) || 0;
    let taxableAmount = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;

    if (gstMode === 'GST Extra') {
        taxableAmount = itemSum;
        totalTaxAmount = round2((taxableAmount * rateNum) / 100);
        totalAmount = round2(taxableAmount + totalTaxAmount);
    } else if (gstMode === 'GST Inclusive') {
        totalAmount = itemSum;
        taxableAmount = round2(totalAmount / (1 + (rateNum / 100)));
        totalTaxAmount = round2(totalAmount - taxableAmount);
    } else {
        // No GST or RCM
        taxableAmount = itemSum;
        totalTaxAmount = 0;
        totalAmount = itemSum;
    }

    // 4. Split CGST/SGST (Intra-state) or IGST (Inter-state)
    let cgstRate = 0, cgstAmount = 0;
    let sgstRate = 0, sgstAmount = 0;
    let igstRate = 0, igstAmount = 0;

    if (totalTaxAmount > 0) {
        if (isInterState) {
            igstRate = rateNum;
            igstAmount = totalTaxAmount;
        } else {
            cgstRate = round2(rateNum / 2);
            sgstRate = round2(rateNum / 2);
            cgstAmount = round2(totalTaxAmount / 2);
            sgstAmount = round2(totalTaxAmount - cgstAmount); // Guard against 1-cent rounding diff
        }
    }

    const advanceNum = round2(Number(advanceAdjusted) || 0);
    const netPayable = Math.max(0, round2(totalAmount - advanceNum));

    // 5. Check/Update Client & Ledger
    let clientRecord = null;
    if (billTo.mobile) {
        clientRecord = await Client.findOne({ company: companyId, mobile: billTo.mobile });
        if (!clientRecord) {
            clientRecord = await Client.create({
                company: companyId,
                name: billTo.name,
                mobile: billTo.mobile,
                gstNumber: billTo.gstin || '',
                address: billTo.address || '',
                totalBilled: totalAmount,
                totalPaid: advanceNum,
                balance: netPayable
            });
        } else {
            // Update client billing details
            if (billTo.gstin && !clientRecord.gstNumber) clientRecord.gstNumber = billTo.gstin;
            if (billTo.address && !clientRecord.address) clientRecord.address = billTo.address;
            clientRecord.totalBilled = round2(clientRecord.totalBilled + totalAmount);
            clientRecord.totalPaid = round2(clientRecord.totalPaid + advanceNum);
            clientRecord.balance = round2(clientRecord.totalBilled - clientRecord.totalPaid);
            await clientRecord.save();
        }
    }

    // 6. Create Invoice
    const invoice = await Invoice.create({
        invoiceNumber,
        company: companyId,
        booking: bookingRef || null,
        bookingId: bookingId || '',
        client: clientRecord ? clientRecord._id : null,
        billTo: {
            name: billTo.name,
            companyName: billTo.companyName || '',
            mobile: billTo.mobile,
            email: billTo.email || '',
            address: billTo.address || '',
            gstin: billTo.gstin || '',
            placeOfSupply: billTo.placeOfSupply || 'Rajasthan',
            stateCode: billTo.stateCode || '08'
        },
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        salesLedger,
        items: formattedItems,
        sacCode,
        taxableAmount,
        gstMode,
        gstRate: rateNum,
        isInterState,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalTaxAmount,
        totalAmount,
        advanceAdjusted: advanceNum,
        netPayable,
        status,
        paymentDetails: paymentDetails || undefined,
        termsAndConditions: termsAndConditions || [
            'All disputes are subject to Jaipur jurisdiction only.',
            'Payment is strictly due within the payment terms mentioned.',
            'Toll taxes, parking charges, and border entry taxes are extra if not specified.',
            'This is a computer generated invoice and does not require physical signature.'
        ],
        notes: notes || '',
        createdBy: req.user?.name || 'Admin'
    });

    // 7. Record Ledger Entry for this Tax Invoice
    if (clientRecord && status !== 'Draft') {
        await LedgerEntry.create({
            client: clientRecord._id,
            company: companyId,
            type: 'Bill',
            amount: totalAmount,
            taxableAmount,
            gstAmount: totalTaxAmount,
            description: `Tax Invoice ${invoiceNumber} issued for ${billTo.name}`,
            referenceId: invoice._id
        });
    }

    // 8. Update linked Booking status if applicable
    if (bookingRef) {
        await Booking.findByIdAndUpdate(bookingRef, {
            bookingStatus: 'Invoiced',
            notes: (await Booking.findById(bookingRef))?.notes 
                ? `${(await Booking.findById(bookingRef)).notes} | Invoiced: ${invoiceNumber}` 
                : `Invoiced: ${invoiceNumber}`
        });
    } else if (bookingId) {
        await Booking.findOneAndUpdate({ bookingId }, {
            bookingStatus: 'Invoiced'
        });
    }

    res.status(201).json(invoice);
});

// @desc    Get all invoices for a company
// @route   GET /api/invoices/:companyId
// @access  Private/AdminOrExecutive
const getInvoices = asyncHandler(async (req, res) => {
    const { status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const companyId = req.params.companyId || req.user?.company;

    const query = { company: companyId };

    if (status && status !== 'All') {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } },
            { 'billTo.name': { $regex: search, $options: 'i' } },
            { 'billTo.mobile': { $regex: search, $options: 'i' } },
            { 'billTo.gstin': { $regex: search, $options: 'i' } },
            { 'billTo.companyName': { $regex: search, $options: 'i' } }
        ];
    }

    if (startDate || endDate) {
        query.invoiceDate = {};
        if (startDate) query.invoiceDate.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.invoiceDate.$lte = end;
        }
    }

    const invoices = await Invoice.find(query)
        .populate('booking', 'bookingId travelStartDate travelEndDate vehicleType clientName')
        .populate('client', 'name mobile balance')
        .populate('company', 'name gstNumber logoUrl ownerName whatsappNumber')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Invoice.countDocuments(query);

    // Compute summary KPIs
    const allMatching = await Invoice.find({ company: companyId });
    const kpiSummary = {
        totalInvoices: allMatching.length,
        totalInvoicedAmount: allMatching.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? inv.totalAmount : 0), 0),
        totalCollectedAmount: allMatching.reduce((acc, inv) => {
            if (inv.status === 'Cancelled') return acc;
            if (inv.status === 'Paid') return acc + inv.totalAmount;
            return acc + (inv.advanceAdjusted || 0);
        }, 0),
        totalPendingAmount: allMatching.reduce((acc, inv) => {
            if (inv.status === 'Cancelled' || inv.status === 'Paid') return acc;
            return acc + inv.netPayable;
        }, 0),
        totalGstCollected: allMatching.reduce((acc, inv) => acc + (inv.status !== 'Cancelled' ? (inv.totalTaxAmount || 0) : 0), 0)
    };

    res.json({
        invoices,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        kpiSummary
    });
});

// @desc    Get single invoice by ID
// @route   GET /api/invoices/single/:id
// @access  Private/AdminOrExecutive
const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('company')
        .populate('booking')
        .populate('client');

    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    res.json(invoice);
});

// @desc    Update invoice status (Issued, Paid, Cancelled)
// @route   PUT /api/invoices/:id/status
// @access  Private/AdminOrExecutive
const updateInvoiceStatus = asyncHandler(async (req, res) => {
    const { status, paymentMode, paymentReference, notes } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    const prevStatus = invoice.status;
    invoice.status = status;
    if (notes) {
        invoice.notes = `${invoice.notes ? invoice.notes + ' | ' : ''}${notes}`;
    }

    await invoice.save();

    // If marked Paid and was previously not paid, update client ledger
    if (status === 'Paid' && prevStatus !== 'Paid' && invoice.client) {
        const client = await Client.findById(invoice.client);
        if (client) {
            client.totalPaid = round2(client.totalPaid + invoice.netPayable);
            client.balance = Math.max(0, round2(client.totalBilled - client.totalPaid));
            await client.save();

            await LedgerEntry.create({
                client: client._id,
                company: invoice.company,
                type: 'Payment',
                amount: invoice.netPayable,
                description: `Full payment received for Invoice ${invoice.invoiceNumber} via ${paymentMode || 'Bank Transfer'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
                referenceId: invoice._id
            });
        }
    }

    // If cancelled, record reversal
    if (status === 'Cancelled' && prevStatus !== 'Cancelled' && invoice.client) {
        const client = await Client.findById(invoice.client);
        if (client) {
            client.totalBilled = Math.max(0, round2(client.totalBilled - invoice.totalAmount));
            client.balance = Math.max(0, round2(client.totalBilled - client.totalPaid));
            await client.save();
        }
    }

    res.json({ message: `Invoice status updated to ${status}`, invoice });
});

// @desc    Delete draft invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    if (invoice.status !== 'Draft') {
        res.status(400);
        throw new Error('Only Draft invoices can be permanently deleted. Use Cancel for issued invoices.');
    }

    await invoice.deleteOne();
    res.json({ message: 'Draft invoice deleted successfully' });
});

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice
};
