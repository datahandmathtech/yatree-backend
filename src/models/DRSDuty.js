const mongoose = require('mongoose');

const drsDutySchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        default: null
    },
    bookingId: {
        type: String,
        default: null
    },
    bookingRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    clientName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        default: '09:00 AM'
    },
    pickupPoint: {
        type: String,
        default: ''
    },
    duty: {
        type: String,
        default: ''
    },
    dayNo: {
        type: Number,
        default: 1
    },
    carType: {
        type: String,
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    itinerary: {
        type: String,
        required: true
    },
    revenue: {
        type: Number,
        required: true,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Advance Received', 'Partial', 'Full Received', 'Refund Due'],
        default: 'Pending'
    },
    status: {
        type: String,
        enum: ['Pending', 'Scheduled', 'Assigned', 'Started', 'Ongoing', 'Completed', 'Cancelled', 'No-show'],
        default: 'Pending'
    },
    isDirectBooking: {
        type: Boolean,
        default: false
    },
    guestRemarks: {
        type: String,
        default: ''
    },
    driverNotes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for efficient querying by date and company
drsDutySchema.index({ company: 1, date: 1 });
drsDutySchema.index({ company: 1, bookingId: 1 });

module.exports = mongoose.model('DRSDuty', drsDutySchema);
