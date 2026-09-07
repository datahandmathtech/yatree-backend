const Lead = require('../models/Lead');
const DRSDuty = require('../models/DRSDuty');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const Company = require('../models/Company');
const { getNextSequence } = require('../models/Sequence');
const asyncHandler = require('express-async-handler');

// @desc    Get all leads for a company
// @route   GET /api/leads/:companyId
// @access  Private/AdminOrExecutive
const getLeads = asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    let query = { company: req.params.companyId };

    if (status && status !== 'All') {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { leadId: { $regex: search, $options: 'i' } },
            { source: { $regex: search, $options: 'i' } }
        ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
});

// @desc    Check duplicate phone number across leads and clients
// @route   GET /api/leads/check-phone/:companyId
// @access  Private/AdminOrExecutive
const checkDuplicatePhone = asyncHandler(async (req, res) => {
    const { phone } = req.query;
    if (!phone || phone.trim().length < 6) {
        return res.json({ exists: false, count: 0, history: [] });
    }

    const cleanPhone = phone.trim();
    const existingLeads = await Lead.find({
        company: req.params.companyId,
        mobileNumber: { $regex: cleanPhone }
    }).select('leadId clientName mobileNumber status travelStartDate totalAmount createdAt').sort({ createdAt: -1 }).limit(5);

    const existingBookings = await Booking.find({
        company: req.params.companyId,
        mobileNumber: { $regex: cleanPhone }
    }).select('bookingId clientName mobileNumber bookingStatus travelStartDate totalAmount').sort({ createdAt: -1 }).limit(5);

    const exists = existingLeads.length > 0 || existingBookings.length > 0;
    res.json({
        exists,
        count: existingLeads.length + existingBookings.length,
        leads: existingLeads,
        bookings: existingBookings
    });
});

// @desc    Get single lead
// @route   GET /api/leads/single/:id
// @access  Private/AdminOrExecutive
const getLeadById = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }
    res.json(lead);
});

// @desc    Create a new lead
// @route   POST /api/leads
// @access  Private/AdminOrExecutive
const createLead = asyncHandler(async (req, res) => {
    const {
        company, clientName, mobileNumber, alternateMobile, email, gstin,
        source, reference, salesPerson, leadDate, travelStartDate, travelEndDate,
        carType, numberOfCars, itinerary, extraCharges, totalAmount, gstMode, notes
    } = req.body;

    const leadId = await getNextSequence('LK-LEAD');

    // Ensure itinerary items have proper default fields
    const formattedItinerary = (itinerary || []).map((day, idx) => ({
        dayNo: day.dayNo || (idx + 1),
        date: day.date,
        time: day.time || '09:00 AM',
        pickupPoint: day.pickupPoint || '',
        duty: day.duty || day.description || '',
        description: day.description || day.duty || 'Standard Duty',
        vehicleType: day.vehicleType || carType || '',
        vehicleCount: day.vehicleCount || 1,
        estimatedKm: Number(day.estimatedKm) || 0,
        estimatedHours: Number(day.estimatedHours) || 0,
        amount: Number(day.amount) || 0,
        inclusions: day.inclusions || '',
        exclusions: day.exclusions || '',
        specialNotes: day.specialNotes || ''
    }));

    const lead = await Lead.create({
        leadId,
        company,
        clientName,
        mobileNumber,
        alternateMobile,
        email,
        gstin,
        source: source || 'Website',
        reference,
        salesPerson: salesPerson || (req.user ? req.user.name : ''),
        salesUser: req.user ? req.user._id : null,
        leadDate: leadDate || Date.now(),
        travelStartDate,
        travelEndDate,
        carType,
        numberOfCars: Number(numberOfCars) || 1,
        itinerary: formattedItinerary,
        extraCharges: extraCharges || [],
        totalAmount: Number(totalAmount) || 0,
        gstMode: gstMode || 'GST Inclusive',
        status: 'New',
        notes
    });

    res.status(201).json(lead);
});

// @desc    Update a lead
// @route   PUT /api/leads/single/:id
// @access  Private/AdminOrExecutive
const updateLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    if (req.body.itinerary) {
        req.body.itinerary = req.body.itinerary.map((day, idx) => ({
            ...day,
            dayNo: day.dayNo || (idx + 1),
            description: day.description || day.duty || 'Standard Duty'
        }));
    }

    const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.json(updatedLead);
});

// @desc    Delete a lead
// @route   DELETE /api/leads/single/:id
// @access  Private/AdminOrExecutive
const deleteLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    if (lead.status === 'Confirmed') {
        res.status(400);
        throw new Error('Cannot delete a confirmed lead. Please cancel the booking instead.');
    }

    await lead.deleteOne();
    res.json({ message: 'Lead removed successfully' });
});

// @desc    Convert lead to booking (Creates Booking, DRS entries, and ledger records)
// @route   POST /api/leads/:id/convert
// @access  Private/AdminOrExecutive
const convertToBooking = asyncHandler(async (req, res) => {
    const { advancePayment, paymentMode, paymentReference, termsAndConditions, notes, adminOverrideReason } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    if (lead.status === 'Confirmed') {
        res.status(400);
        throw new Error('Lead is already confirmed');
    }

    const advance = Number(advancePayment) || 0;
    if (advance <= 0 && !adminOverrideReason) {
        res.status(400);
        throw new Error('Advance payment or admin override reason is required to confirm booking');
    }

    // 1. Generate unique sequential Booking ID (e.g. LK-BKG-2026-00001)
    const bookingId = await getNextSequence('LK-BKG');

    // 2. Determine GST breakdown based on GST mode and company settings
    const companyData = await Company.findById(lead.company);
    const gstRate = companyData?.gstRate || 5;
    let taxableAmount = 0;
    let gstAmount = 0;
    const totalFare = Number(lead.totalAmount) || 0;

    if (lead.gstMode === 'GST Extra') {
        taxableAmount = totalFare;
        gstAmount = Number(((totalFare * gstRate) / 100).toFixed(2));
    } else if (lead.gstMode === 'GST Inclusive') {
        taxableAmount = Number((totalFare / (1 + (gstRate / 100))).toFixed(2));
        gstAmount = Number((totalFare - taxableAmount).toFixed(2));
    } else {
        // No GST or RCM
        taxableAmount = totalFare;
        gstAmount = 0;
    }

    const grandTotal = lead.gstMode === 'GST Extra' ? (totalFare + gstAmount) : totalFare;
    const balanceDue = grandTotal - advance;

    // 3. Client & Ledger Records
    let client = await Client.findOne({ company: lead.company, mobile: lead.mobileNumber });
    if (!client) {
        client = await Client.create({
            company: lead.company,
            name: lead.clientName,
            mobile: lead.mobileNumber,
            totalBilled: grandTotal,
            totalPaid: advance,
            balance: balanceDue
        });
    } else {
        client.totalBilled += grandTotal;
        client.totalPaid += advance;
        client.balance += balanceDue;
        await client.save();
    }

    // Create Bill Entry in Client Ledger
    await LedgerEntry.create({
        client: client._id,
        company: lead.company,
        type: 'Bill',
        amount: grandTotal,
        taxableAmount,
        gstAmount,
        description: `Booking Confirmed (${bookingId}) - ${lead.clientName}`,
        referenceId: lead._id
    });

    // Create Advance Payment Entry if paid
    if (advance > 0) {
        await LedgerEntry.create({
            client: client._id,
            company: lead.company,
            type: 'Advance',
            amount: advance,
            description: `Advance received for Booking ${bookingId} via ${paymentMode || 'Cash'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
            referenceId: lead._id
        });
    }

    // 4. Create Day-wise DRS entries for each car
    const numberOfCars = lead.numberOfCars || 1;
    const drsEntries = [];

    for (const day of lead.itinerary) {
        for (let i = 0; i < numberOfCars; i++) {
            const dutyText = day.duty || day.description || 'Scheduled Duty';
            const carLabel = numberOfCars > 1 ? ` (Car ${i + 1}/${numberOfCars})` : '';
            
            const entry = await DRSDuty.create({
                company: lead.company,
                leadId: lead._id,
                bookingId: bookingId,
                clientName: `${lead.clientName}${carLabel}`,
                mobileNumber: lead.mobileNumber,
                date: day.date,
                time: day.time || '09:00 AM',
                pickupPoint: day.pickupPoint || '',
                duty: dutyText,
                dayNo: day.dayNo || 1,
                carType: day.vehicleType || lead.carType,
                itinerary: dutyText,
                revenue: day.amount || 0,
                paymentStatus: advance > 0 ? (balanceDue <= 0 ? 'Full Received' : 'Advance Received') : 'Pending',
                status: 'Scheduled',
                isDirectBooking: false,
                guestRemarks: day.specialNotes || ''
            });
            drsEntries.push(entry._id);
        }
    }

    // 5. Create the Booking document
    const booking = await Booking.create({
        bookingId,
        company: lead.company,
        lead: lead._id,
        client: client._id,
        salesPerson: lead.salesPerson,
        source: lead.source || lead.reference || 'Direct',
        clientName: lead.clientName,
        mobileNumber: lead.mobileNumber,
        alternateMobile: lead.alternateMobile,
        email: lead.email,
        gstin: lead.gstin,
        bookingDate: new Date(),
        travelStartDate: lead.travelStartDate,
        travelEndDate: lead.travelEndDate,
        vehicleType: lead.carType,
        numberOfCars: lead.numberOfCars,
        itinerary: lead.itinerary,
        totalAmount: grandTotal,
        advancePaid: advance,
        balanceDue: balanceDue,
        gstMode: lead.gstMode,
        gstRate,
        taxableAmount,
        gstAmount,
        bookingStatus: 'Confirmed',
        paymentStatus: advance >= grandTotal ? 'Full Received' : (advance > 0 ? 'Advance Received' : 'No Advance'),
        termsAndConditions: termsAndConditions || [
            'All rates are strictly subject to vehicle availability at the time of confirmation.',
            'Toll, Tax, Parking, State Border Tax will be charged on actuals unless explicitly mentioned.',
            'Air conditioner will not work in stationary/parked vehicle or uphill driving.',
            'Night driving charge applies between 10:00 PM and 06:00 AM.'
        ],
        notes: notes || adminOverrideReason || '',
        drsDuties: drsEntries
    });

    // 6. Update lead status and reference, and link drsDuties with bookingRef
    if (drsEntries.length > 0) {
        await DRSDuty.updateMany(
            { _id: { $in: drsEntries } },
            { bookingRef: booking._id }
        );
    }

    lead.status = 'Confirmed';
    lead.advancePayment = advance;
    lead.bookingId = bookingId;
    lead.bookingRef = booking._id;
    await lead.save();

    res.json({
        message: 'Booking confirmed successfully',
        booking,
        lead,
        createdDutiesCount: drsEntries.length
    });
});

module.exports = {
    getLeads,
    checkDuplicatePhone,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    convertToBooking
};
