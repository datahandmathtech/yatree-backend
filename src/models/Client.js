const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    gstNumber: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    totalBilled: {
        type: Number,
        default: 0
    },
    totalPaid: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Ensure unique mobile per company to avoid duplicate client ledgers
clientSchema.index({ company: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);
