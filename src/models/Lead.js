const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
    dayNo: { type: Number, default: 1 },
    date: { type: Date, required: true },
    time: { type: String, default: '09:00 AM' },
    isApg: { type: Boolean, default: false },
    pickupPoint: { type: String, default: '' },
    duty: { type: String, default: '' },
    description: { type: String, default: '' }, // Keep description for backwards compatibility
    vehicleType: { type: String, default: '' },
    vehicleCount: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    inclusions: { type: String, default: '' },
    exclusions: { type: String, default: '' },
    specialNotes: { type: String, default: '' }
});

const extraChargeSchema = new mongoose.Schema({
    type: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 }
});

const leadSchema = new mongoose.Schema({
    clientCode: {
        type: String,
        index: true
    },
    leadId: {
        type: String,
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    salesPerson: {
        type: String,
        default: ''
    },
    salesUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    clientName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true,
        index: true
    },
    alternateMobile: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    gstin: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        default: 'Website'
    },
    reference: {
        type: String,
        default: ''
    },
    leadDate: {
        type: Date,
        default: Date.now
    },
    travelStartDate: {
        type: Date,
        required: true
    },
    travelEndDate: {
        type: Date,
        required: true
    },
    carType: {
        type: String,
        required: true
    },
    numberOfCars: {
        type: Number,
        required: true,
        default: 1
    },
    itinerary: [itinerarySchema],
    extraCharges: [extraChargeSchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    advancePayment: {
        type: Number,
        default: 0
    },
    gstMode: {
        type: String,
        enum: ['GST Extra', 'GST Inclusive', 'No GST', 'RCM'],
        default: 'GST Inclusive'
    },
    status: {
        type: String,
        enum: ['New', 'Follow-up', 'Quoted', 'Negotiation', 'Confirmed', 'Lost', 'Cancelled'],
        default: 'New'
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
    notes: {
        type: String,
        default: ''
    },
    specialRemarks: {
        type: String,
        default: ''
    },
    inclusions: {
        driverAllowance: { type: Boolean, default: true },
        nightAllowance: { type: Boolean, default: true },
        tollParking: { type: Boolean, default: true },
        gstIncluded: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

leadSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
