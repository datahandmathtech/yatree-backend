const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');

// @desc    Get all clients for a company
// @route   GET /api/clients/:companyId
// @access  Private/Admin
const getClients = asyncHandler(async (req, res) => {
    const clients = await Client.find({ company: req.params.companyId }).sort({ updatedAt: -1 });
    res.json(clients);
});

// @desc    Get client ledger entries
// @route   GET /api/clients/:id/ledger
// @access  Private/Admin
const getClientLedger = asyncHandler(async (req, res) => {
    const entries = await LedgerEntry.find({ client: req.params.id }).sort({ date: -1, createdAt: -1 });
    res.json(entries);
});

// @desc    Add manual payment to client ledger
// @route   POST /api/clients/:id/payment
// @access  Private/Admin
const addPayment = asyncHandler(async (req, res) => {
    const { amount, description, date } = req.body;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
        res.status(404);
        throw new Error('Client not found');
    }

    client.totalPaid += Number(amount);
    client.balance -= Number(amount);
    await client.save();

    const entry = await LedgerEntry.create({
        client: client._id,
        company: client.company,
        type: 'Payment',
        amount: Number(amount),
        description: description || 'Manual Payment Received',
        date: date || Date.now()
    });

    res.status(201).json({ message: 'Payment recorded', client, entry });
});

// @desc    Update client GST info
// @route   PUT /api/clients/:id
// @access  Private/Admin
const updateClient = asyncHandler(async (req, res) => {
    const { gstNumber, address, name, mobile } = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, {
        gstNumber, address, name, mobile
    }, { new: true });
    
    if(!client) {
        res.status(404);
        throw new Error('Client not found');
    }

    res.json(client);
});


module.exports = {
    getClients,
    getClientLedger,
    addPayment,
    updateClient
};
