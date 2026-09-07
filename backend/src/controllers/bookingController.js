const Booking = require('../models/Booking');
const DRSDuty = require('../models/DRSDuty');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const asyncHandler = require('express-async-handler');

// @desc    Get all bookings for a company with filters
// @route   GET /api/bookings/:companyId
// @access  Private/AdminOrExecutive
const getBookings = asyncHandler(async (req, res) => {
    const { status, paymentStatus, search, startDate, endDate } = req.query;
    let query = { company: req.params.companyId };

    if (status && status !== 'All') {
        query.bookingStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'All') {
        query.paymentStatus = paymentStatus;
    }

    if (startDate && endDate) {
        query.travelStartDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (search) {
        query.$or = [
            { bookingId: { $regex: search, $options: 'i' } },
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { vehicleType: { $regex: search, $options: 'i' } }
        ];
    }

    const bookings = await Booking.find(query)
        .populate('lead', 'leadId status totalAmount')
        .populate('client', 'name mobile balance')
        .sort({ createdAt: -1 });

    res.json(bookings);
});

// @desc    Get single booking by ID
// @route   GET /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('company')
        .populate('lead')
        .populate('client')
        .populate({
            path: 'drsDuties',
            populate: [
                { path: 'driver', select: 'name phone' },
                { path: 'vehicle', select: 'carNumber model' }
            ]
        });

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    res.json(booking);
});

// @desc    Update a booking
// @route   PUT /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const updateBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    const { bookingStatus, paymentStatus, notes, termsAndConditions } = req.body;

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (notes !== undefined) booking.notes = notes;
    if (termsAndConditions) booking.termsAndConditions = termsAndConditions;

    await booking.save();
    res.json(booking);
});

// @desc    Record a payment against a booking
// @route   POST /api/bookings/:id/payment
// @access  Private/AdminOrExecutive
const recordBookingPayment = asyncHandler(async (req, res) => {
    const { amount, paymentMode, paymentReference, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
        res.status(400);
        throw new Error('Valid payment amount is required');
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    booking.advancePaid += paymentAmount;
    booking.balanceDue = Math.max(0, booking.totalAmount - booking.advancePaid);

    if (booking.balanceDue <= 0) {
        booking.paymentStatus = 'Full Received';
    } else {
        booking.paymentStatus = 'Partial';
    }

    await booking.save();

    // Update Client balance
    if (booking.client) {
        const client = await Client.findById(booking.client);
        if (client) {
            client.totalPaid += paymentAmount;
            client.balance = Math.max(0, client.balance - paymentAmount);
            await client.save();
        }
    }

    // Create Ledger Entry
    await LedgerEntry.create({
        client: booking.client,
        company: booking.company,
        type: 'Payment',
        amount: paymentAmount,
        description: `Payment received for ${booking.bookingId} via ${paymentMode || 'Cash'} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
        referenceId: booking._id
    });

    res.json({
        message: 'Payment recorded successfully',
        booking
    });
});

// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private/AdminOrExecutive
const cancelBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    booking.bookingStatus = 'Cancelled';
    booking.notes = `${booking.notes ? booking.notes + ' | ' : ''}Cancelled: ${reason || 'Customer request'}`;
    await booking.save();

    // Also cancel all linked DRS duties
    if (booking.drsDuties && booking.drsDuties.length > 0) {
        await DRSDuty.updateMany(
            { _id: { $in: booking.drsDuties } },
            { $set: { status: 'Cancelled' } }
        );
    }

    res.json({ message: 'Booking and linked duties cancelled successfully', booking });
});

module.exports = {
    getBookings,
    getBookingById,
    updateBooking,
    recordBookingPayment,
    cancelBooking
};
