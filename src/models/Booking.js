const mongoose = require('mongoose');

const bookingItinerarySchema = new mongoose.Schema({
    dayNo: { type: Number, default: 1 },
    date: { type: Date, required: true },
    time: { type: String, default: '09:00 AM' },
    pickupPoint: { type: String, default: '' },
    duty: { type: String, default: '' },
    description: { type: String, default: '' },
    vehicleType: { type: String, default: '' },
    vehicleCount: { type: Number, default: 1 },
    estimatedKm: { type: Number, default: 0 },
    estimatedHours: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    inclusions: { type: String, default: '' },
    exclusions: { type: String, default: '' },
    specialNotes: { type: String, default: '' },
    // Driver & Vehicle assignment
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driverId: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    vehicleId: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' }
}, { strict: false });

const bookingSchema = new mongoose.Schema({
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    clientCode: {
        type: String,
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        default: null
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    salesPerson: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        default: 'Direct'
    },
    clientName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
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
    bookingDate: {
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
    vehicleType: {
        type: String,
        required: true
    },
    numberOfCars: {
        type: Number,
        default: 1
    },
    itinerary: [bookingItinerarySchema],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    advancePaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
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
    taxableAmount: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    bookingStatus: {
        type: String,
        enum: ['Confirmed', 'Scheduled', 'Ongoing', 'Completed', 'Invoiced', 'Cancelled', 'Closed'],
        default: 'Confirmed'
    },
    paymentStatus: {
        type: String,
        enum: ['No Advance', 'Advance Received', 'Partial', 'Full Received', 'Refund Due', 'Settled'],
        default: 'Advance Received'
    },
    termsAndConditions: [{
        type: String
    }],
    notes: {
        type: String,
        default: ''
    },
    drsDuties: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DRSDuty'
    }]
}, {
    timestamps: true
});

bookingSchema.index({ company: 1, bookingDate: -1 });
bookingSchema.index({ company: 1, bookingStatus: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
