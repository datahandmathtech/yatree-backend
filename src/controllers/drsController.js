const DRSDuty = require('../models/DRSDuty');
const asyncHandler = require('express-async-handler');

// @desc    Get DRS duties for a company by date, view, or date range
// @route   GET /api/drs/:companyId
// @access  Private/AdminOrExecutive
const getDRSDuties = asyncHandler(async (req, res) => {
    const { date, from, to, view, search } = req.query;
    let query = { company: req.params.companyId };

    if (view === 'upcoming') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.date = { $gte: today };
    } else if (view === 'all') {
        // No date restriction
    } else if (from && to) {
        query.date = {
            $gte: new Date(from),
            $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    } else if (date && date !== 'all') {
        const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
        // Expand buffer by 14 hours to accommodate any timezone shift between client and server
        const bufferStart = new Date(startOfDay.getTime() - (14 * 60 * 60 * 1000));
        const bufferEnd = new Date(endOfDay.getTime() + (14 * 60 * 60 * 1000));

        query.date = {
            $gte: bufferStart,
            $lte: bufferEnd
        };
    }

    if (search) {
        query.$or = [
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { hotel: { $regex: search, $options: 'i' } },
            { duty: { $regex: search, $options: 'i' } },
            { bookingId: { $regex: search, $options: 'i' } },
            { carType: { $regex: search, $options: 'i' } },
            { customCarNumber: { $regex: search, $options: 'i' } },
            { customDriverName: { $regex: search, $options: 'i' } },
            { itinerary: { $regex: search, $options: 'i' } }
        ];
    }

    const duties = await DRSDuty.find(query)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status totalAmount')
        .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue bookingStatus')
        .sort({ date: 1, time: 1 });
        
    res.json(duties);
});

// @desc    Create a DRS duty (Direct or Linked from Booking/Lead/Client)
// @route   POST /api/drs
// @access  Private/AdminOrExecutive
const createDRSDuty = asyncHandler(async (req, res) => {
    const {
        company, clientName, mobileNumber, hotel, date, time,
        carType, customCarNumber, driver, customDriverName, vehicle, itinerary,
        revenue, cOut, status,
        leadId, bookingId, bookingRef, pickupPoint, duty: dutyText, guestRemarks
    } = req.body;

    const duty = await DRSDuty.create({
        company,
        clientName,
        mobileNumber: mobileNumber || '',
        hotel: hotel || '',
        date: date || new Date(),
        time: time || '09:00 AM',
        carType: carType || 'Sedan',
        customCarNumber: customCarNumber || '',
        driver: driver || null,
        customDriverName: customDriverName || '',
        vehicle: vehicle || null,
        itinerary: itinerary || dutyText || 'City Duty',
        duty: dutyText || itinerary || 'City Duty',
        pickupPoint: pickupPoint || '',
        revenue: Number(revenue) || 0,
        cOut: cOut || '',
        status: status || (driver || customDriverName ? 'Assigned' : 'Pending'),
        leadId: leadId || null,
        bookingId: bookingId || null,
        bookingRef: bookingRef || null,
        guestRemarks: guestRemarks || '',
        isDirectBooking: !bookingId && !leadId
    });

    const populated = await DRSDuty.findById(duty._id)
        .populate('driver', 'name mobile')
        .populate('vehicle', 'carNumber model type brand')
        .populate('leadId', 'clientName leadId status')
        .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue');

    res.status(201).json(populated);
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
    .populate('vehicle', 'carNumber model type brand')
    .populate('leadId', 'clientName leadId status')
    .populate('bookingRef', 'bookingId clientName totalAmount advancePaid balanceDue');

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
