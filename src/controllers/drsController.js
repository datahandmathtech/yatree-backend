const DRSDuty = require('../models/DRSDuty');
const asyncHandler = require('express-async-handler');

// @desc    Get DRS duties for a company by date or date range
// @route   GET /api/drs/:companyId
// @access  Private/AdminOrExecutive
const getDRSDuties = asyncHandler(async (req, res) => {
    const { date, from, to } = req.query;
    let query = { company: req.params.companyId };

    if (from && to) {
        query.date = {
            $gte: new Date(from),
            $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    } else if (date) {
        const targetDate = new Date(date);
        query.date = {
            $gte: targetDate,
            $lte: new Date(new Date(targetDate).setHours(23, 59, 59, 999))
        };
    }

    const duties = await DRSDuty.find(query)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName')
        .sort({ date: 1, time: 1 });
        
    res.json(duties);
});

// @desc    Create a direct DRS duty
// @route   POST /api/drs
// @access  Private/AdminOrExecutive
const createDRSDuty = asyncHandler(async (req, res) => {
    const {
        company, clientName, mobileNumber, date, time,
        carType, driver, vehicle, itinerary, revenue, status
    } = req.body;

    const duty = await DRSDuty.create({
        company, clientName, mobileNumber, date, time,
        carType, driver, vehicle, itinerary, revenue, status,
        isDirectBooking: true
    });

    res.status(201).json(duty);
});

// @desc    Update a DRS duty (including assigning driver/vehicle)
// @route   PUT /api/drs/:id
// @access  Private/AdminOrExecutive
const updateDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    const updatedDuty = await DRSDuty.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
    .populate('driver', 'name mobile')
    .populate('vehicle', 'carNumber model type brand');

    res.json(updatedDuty);
});

// @desc    Delete a DRS duty
// @route   DELETE /api/drs/:id
// @access  Private/AdminOrExecutive
const deleteDRSDuty = asyncHandler(async (req, res) => {
    const duty = await DRSDuty.findById(req.params.id);

    if (!duty) {
        res.status(404);
        throw new Error('Duty not found');
    }

    await duty.deleteOne();
    res.json({ message: 'Duty removed' });
});

module.exports = {
    getDRSDuties,
    createDRSDuty,
    updateDRSDuty,
    deleteDRSDuty
};
