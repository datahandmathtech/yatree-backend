require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Lead = require('../src/models/Lead');
    const { Sequence } = require('../src/models/Sequence');

    const leads = await Lead.find({}).sort({ createdAt: 1 });
    console.log(`Found ${leads.length} leads to process.`);

    const monthCounters = {};

    for (const lead of leads) {
        const d = new Date(lead.leadDate || lead.createdAt);
        const year = d.getFullYear();
        const monthNum = d.getMonth() + 1;
        const monthStr = String(monthNum).padStart(2, '0');
        const companyId = lead.company ? String(lead.company) : 'DEFAULT';
        const key = `${companyId}-${year}-${monthStr}`;

        if (!monthCounters[key]) {
            monthCounters[key] = 0;
        }
        monthCounters[key] += 1;
        const seqStr = String(monthCounters[key]).padStart(2, '0');
        const code = `${monthStr}/${seqStr}`;

        lead.clientCode = code;
        lead.leadId = code; // Make clientCode the visible ID
        await lead.save();
        console.log(`Updated Lead ${lead.clientName} (${lead._id}) -> clientCode: ${code}`);
    }

    // Update Sequence collection so future leads increment from the right number
    for (const key of Object.keys(monthCounters)) {
        const seqKey = `CLIENT_CODE-${key}`;
        await Sequence.findOneAndUpdate(
            { id: seqKey },
            { seq: monthCounters[key] },
            { upsert: true }
        );
        console.log(`Synced Sequence ${seqKey} -> ${monthCounters[key]}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
