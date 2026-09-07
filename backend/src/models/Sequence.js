const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    seq: {
        type: Number,
        default: 0
    }
});

const Sequence = mongoose.model('Sequence', sequenceSchema);

/**
 * Generates a clean sequential code such as:
 * getNextSequence('LK-LEAD') -> LK-LEAD-2026-00001
 * getNextSequence('LK-BKG')  -> LK-BKG-2026-00001
 * getNextSequence('LK-INV')  -> LK-INV-2026-00001
 */
const getNextSequence = async (prefix = 'LK', pad = 5) => {
    const year = new Date().getFullYear();
    const key = `${prefix}-${year}`;
    
    const ret = await Sequence.findOneAndUpdate(
        { id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    
    const seqStr = String(ret.seq).padStart(pad, '0');
    return `${prefix}-${year}-${seqStr}`;
};

module.exports = {
    Sequence,
    getNextSequence
};
