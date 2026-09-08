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

/**
 * Generates month-wise client code for leads:
 * e.g., April: 04/01, 04/02, 04/03...
 * May: 05/01, 05/02...
 * Key format: CLIENT_CODE-${companyId}-${year}-${monthStr}
 */
const getNextClientCode = async (companyId, date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const monthStr = String(monthNum).padStart(2, '0');
    const compKey = companyId ? String(companyId) : 'DEFAULT';
    const key = `CLIENT_CODE-${compKey}-${year}-${monthStr}`;

    const ret = await Sequence.findOneAndUpdate(
        { id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const seqStr = String(ret.seq).padStart(2, '0');
    return `${monthStr}/${seqStr}`;
};

/**
 * Previews what the next client code will be WITHOUT incrementing it
 */
const previewNextClientCode = async (companyId, date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const monthStr = String(monthNum).padStart(2, '0');
    const compKey = companyId ? String(companyId) : 'DEFAULT';
    const key = `CLIENT_CODE-${compKey}-${year}-${monthStr}`;

    const seqDoc = await Sequence.findOne({ id: key });
    const currentSeq = seqDoc ? seqDoc.seq : 0;
    const nextSeq = currentSeq + 1;
    const seqStr = String(nextSeq).padStart(2, '0');
    return `${monthStr}/${seqStr}`;
};

module.exports = {
    Sequence,
    getNextSequence,
    getNextClientCode,
    previewNextClientCode
};
