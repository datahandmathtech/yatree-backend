require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Duty = mongoose.connection.db.collection('duties');
    
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    const juneDuties = await Duty.find({ createdAt: { $gte: start, $lte: end } }).toArray();
    console.log(`June Duties: ${juneDuties.length}`);
    
    // Check recent duties
    const dateLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentDuties = await Duty.find({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } }).toArray();
    console.log(`Duties added in last 48 hours: ${recentDuties.length}`);
    
    if (recentDuties.length > 0) {
        for (const d of recentDuties.slice(0,3)) {
            console.log(`- Duty ID: ${d._id}, Company: ${d.company}`);
        }
    }
    
    process.exit(0);
}

run().catch(console.error);
