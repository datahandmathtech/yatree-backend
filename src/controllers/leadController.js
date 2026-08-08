const Lead = require('../models/Lead');
const DRSDuty = require('../models/DRSDuty');
const asyncHandler = require('express-async-handler');

// @desc    Get all leads for a company
// @route   GET /api/leads/:companyId
// @access  Private/AdminOrExecutive
const getLeads = asyncHandler(async (req, res) => {
    const leads = await Lead.find({ company: req.params.companyId }).sort({ createdAt: -1 });
    res.json(leads);
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
        company, clientName, mobileNumber, reference, leadDate,
        travelStartDate, travelEndDate, carType, numberOfCars,
        itinerary, extraCharges, totalAmount, notes
    } = req.body;

    const lead = await Lead.create({
        company, clientName, mobileNumber, reference, leadDate,
        travelStartDate, travelEndDate, carType, numberOfCars,
        itinerary, extraCharges, totalAmount, notes,
        status: 'New'
    });

    res.status(201).json(lead);
});

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private/AdminOrExecutive
const updateLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.json(updatedLead);
});

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private/AdminOrExecutive
const deleteLead = asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    await lead.deleteOne();
    res.json({ message: 'Lead removed' });
});

// @desc    Convert lead to booking (Creates DRS entries)
// @route   POST /api/leads/:id/convert
// @access  Private/AdminOrExecutive
const convertToBooking = asyncHandler(async (req, res) => {
    const { advancePayment } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
        res.status(404);
        throw new Error('Lead not found');
    }

    if (lead.status === 'Confirmed') {
        res.status(400);
        throw new Error('Lead is already confirmed');
    }

    // Update lead status and advance
    lead.status = 'Confirmed';
    lead.advancePayment = advancePayment || 0;
    await lead.save();

    // Client Ledger Logic
    const Client = require('../models/Client');
    const LedgerEntry = require('../models/LedgerEntry');
    const Company = require('../models/Company');

    let client = await Client.findOne({ company: lead.company, mobile: lead.mobileNumber });
    if (!client) {
        client = await Client.create({
            company: lead.company,
            name: lead.clientName,
            mobile: lead.mobileNumber,
            totalBilled: lead.totalAmount,
            totalPaid: advancePayment || 0,
            balance: lead.totalAmount - (advancePayment || 0)
        });
    } else {
        client.totalBilled += lead.totalAmount;
        client.totalPaid += (advancePayment || 0);
        client.balance += (lead.totalAmount - (advancePayment || 0));
        await client.save();
    }

    // Determine GST Division based on Company settings
    const companyData = await Company.findById(lead.company);
    const gstRate = companyData?.gstRate || 5;
    // Assuming totalAmount includes GST.
    // Base amount = totalAmount / (1 + gstRate/100)
    const taxableAmount = (lead.totalAmount / (1 + (gstRate / 100))).toFixed(2);
    const gstAmount = (lead.totalAmount - taxableAmount).toFixed(2);

    // Create Bill Entry
    await LedgerEntry.create({
        client: client._id,
        company: lead.company,
        type: 'Bill',
        amount: lead.totalAmount,
        taxableAmount: Number(taxableAmount),
        gstAmount: Number(gstAmount),
        description: `Booking Bill for Lead ${lead._id.toString().substring(0,6)}`,
        referenceId: lead._id
    });

    // Create Advance Payment Entry if paid
    if (advancePayment > 0) {
        await LedgerEntry.create({
            client: client._id,
            company: lead.company,
            type: 'Advance',
            amount: advancePayment,
            description: `Advance received for Booking`,
            referenceId: lead._id
        });
    }

    const numberOfCars = lead.numberOfCars || 1;
    const drsEntries = [];

    // Create DRS entries for each day in itinerary, for each car
    for (const day of lead.itinerary) {
        for (let i = 0; i < numberOfCars; i++) {
            const entry = await DRSDuty.create({
                company: lead.company,
                leadId: lead._id,
                clientName: lead.clientName + (numberOfCars > 1 ? ` (Car ${i + 1})` : ''),
                mobileNumber: lead.mobileNumber,
                date: day.date,
                time: '09:00 AM', // Default time, can be updated later in DRS
                carType: lead.carType,
                itinerary: day.description,
                revenue: day.amount,
                status: 'Pending',
                isDirectBooking: false
            });
            drsEntries.push(entry);
        }
    }

    res.json({ message: 'Lead converted to booking successfully', lead, createdDutiesCount: drsEntries.length });
});

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    convertToBooking
};
