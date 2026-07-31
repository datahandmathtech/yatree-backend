const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('../src/models/User');
        const Attendance = require('../src/models/Attendance');
        
        const drivers = await User.find({ company: '6a6ae0b1c21904a20a92919a', role: 'Driver' });
        
        for (const d of drivers) {
            const count = await Attendance.countDocuments({ 
                driver: d._id, 
                date: { $regex: '^2026-06' } 
            });
            if (count > 0) {
                console.log(d.name + ': ' + count);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
