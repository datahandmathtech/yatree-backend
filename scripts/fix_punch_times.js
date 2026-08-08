const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = require('../src/models/Attendance');

        const filter = {
            date: { $regex: '^2026-06' },
            $or: [
                { 'punchIn.time': { $exists: false } },
                { 'punchIn.time': null }
            ]
        };

        const duties = await Attendance.find(filter);
        console.log(`Found ${duties.length} duties without punchIn.time.`);

        let updated = 0;
        for (const duty of duties) {
            const dateObj = new Date(duty.date);
            // Default to 9 AM
            const punchInTime = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
            // Default to 5 PM (8 hours later)
            const punchOutTime = new Date(punchInTime.getTime() + (8 * 60 * 60 * 1000));

            duty.punchIn = duty.punchIn || {};
            duty.punchIn.time = punchInTime;

            duty.punchOut = duty.punchOut || {};
            duty.punchOut.time = punchOutTime;
            duty.punchOut.remarks = duty.punchOut.remarks || 'Duty';

            await duty.save();
            updated++;
        }

        console.log(`Successfully fixed ${updated} duties.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
