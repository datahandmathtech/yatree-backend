const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    type: {
        type: String,
        enum: ['Bill', 'Payment', 'Fuel', 'Advance'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    taxableAmount: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId, // Can be Fuel ID, Lead ID, DRS ID, etc.
        default: null
    }
}, { timestamps: true });

// Index for fast queries
ledgerEntrySchema.index({ client: 1, date: -1 });
ledgerEntrySchema.index({ company: 1, date: -1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
