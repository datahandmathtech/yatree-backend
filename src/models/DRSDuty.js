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
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    isDirectBooking: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient querying by date and company
drsDutySchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('DRSDuty', drsDutySchema);
