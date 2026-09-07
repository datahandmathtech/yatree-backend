const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    sacCode: {
        type: String,
        default: '996601'
    },
    quantity: {
        type: Number,
        default: 1
    },
    rate: {
        type: Number,
        required: true,
        default: 0
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    }
});

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    bookingId: {
        type: String,
        default: ''
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    billTo: {
        name: { type: String, required: true },
        companyName: { type: String, default: '' },
        mobile: { type: String, required: true },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        gstin: { type: String, default: '' },
        placeOfSupply: { type: String, default: 'Rajasthan' },
        stateCode: { type: String, default: '08' }
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    salesLedger: {
        type: String,
        enum: ['Taxi Sales', 'Tour Package Sales', 'Corporate Travel Sales', 'Cash Sales'],
        default: 'Taxi Sales'
    },
    items: [invoiceItemSchema],
    sacCode: {
        type: String,
        default: '996601'
    },
    taxableAmount: {
        type: Number,
        required: true,
        default: 0
    },
    gstMode: {
        type: String,
        enum: ['GST Extra', 'GST Inclusive', 'No GST', 'RCM'],
        default: 'GST Extra'
    },
    gstRate: {
        type: Number,
        default: 5
    },
    isInterState: {
        type: Boolean,
        default: false
    },
    cgstRate: {
        type: Number,
        default: 2.5
    },
    cgstAmount: {
        type: Number,
        default: 0
    },
    sgstRate: {
        type: Number,
        default: 2.5
    },
    sgstAmount: {
        type: Number,
        default: 0
    },
    igstRate: {
        type: Number,
        default: 0
    },
    igstAmount: {
        type: Number,
        default: 0
    },
    totalTaxAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    advanceAdjusted: {
        type: Number,
        default: 0
    },
    netPayable: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Issued', 'Paid', 'Cancelled'],
        default: 'Issued'
    },
    paymentDetails: {
        bankName: { type: String, default: 'HDFC Bank Ltd' },
        accountNumber: { type: String, default: '50200067891234' },
        ifscCode: { type: String, default: 'HDFC0001234' },
        branchName: { type: String, default: 'Jaipur Main Branch' },
        upiId: { type: String, default: 'logkaro@hdfcbank' }
    },
    termsAndConditions: [{
        type: String
    }],
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'Admin'
    }
}, {
    timestamps: true
});

invoiceSchema.index({ company: 1, invoiceDate: -1 });
invoiceSchema.index({ company: 1, status: 1 });
invoiceSchema.index({ company: 1, invoiceNumber: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
