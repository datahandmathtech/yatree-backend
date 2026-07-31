const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = require('../src/models/Attendance');

        // Find all duties in June that have status running but have a punchOut time
        const filter = {
            date: { $regex: '^2026-06' },
            status: { $ne: 'completed' },
            'punchOut.time': { $exists: true, $ne: null }
        };

        const result = await Attendance.updateMany(filter, { $set: { status: 'completed' } });
        console.log(`Successfully fixed ${result.modifiedCount} duties to be completed.`);
        
        // Also fix the ones that specifically have 'System Auto Present (Excel)' just in case
        const filter2 = {
            date: { $regex: '^2026-06' },
            status: { $ne: 'completed' },
            remarks: 'System Auto Present (Excel)'
        };
        const result2 = await Attendance.updateMany(filter2, { $set: { status: 'completed' } });
        console.log(`Successfully fixed ${result2.modifiedCount} auto-duties to be completed.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
