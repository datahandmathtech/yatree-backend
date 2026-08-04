const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 }
});

const extraChargeSchema = new mongoose.Schema({
    type: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 }
});

const leadSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    reference: {
        type: String
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
    status: {
        type: String,
        enum: ['New', 'Quoted', 'Confirmed', 'Lost'],
        default: 'New'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
