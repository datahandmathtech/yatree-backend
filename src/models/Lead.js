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

const remarkSchema = new mongoose.Schema({
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
    attachmentUrl: { type: String, default: null }
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
    bookingReference: {
        type: String,
        enum: ['Direct', 'Travel Agent'],
        default: 'Direct'
    },
    travelAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    travelAgentName: {
        type: String,
        default: ''
    },
    travelAgentMobile: {
        type: String,
        default: ''
    },
    clientName: {
        type: String,
        default: 'Guest (TBA)'
    },
    mobileNumber: {
        type: String,
        default: 'TBA',
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
    advanceDate: {
        type: Date,
        default: null
    },
    gstMode: {
        type: String,
        enum: ['GST Extra', 'GST Inclusive', 'No GST', 'RCM'],
        default: 'GST Inclusive'
    },
    gstRate: {
        type: Number,
        default: 5
    },
    priority: {
        type: String,
        enum: ['Hot', 'Warm', 'Cold', 'Unassigned'],
        default: 'Unassigned'
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
        gstIncluded: { type: Boolean, default: true },
        manualRemarks: { type: String, default: '' }
    },
    remarksHistory: [remarkSchema]
}, {
    timestamps: true
});

leadSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
