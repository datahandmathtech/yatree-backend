const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = require('../src/models/Vehicle');
        const Attendance = require('../src/models/Attendance');
        
        let dummy = await Vehicle.findOne({ carNumber: /OFFICE/i });
        if (!dummy) {
            dummy = new Vehicle({ 
                company: '6a6ae0b1c21904a20a92919a', 
                carNumber: 'OFFICE DUTY', 
                model: 'N/A', 
                status: 'active',
                permitType: 'Local'
            });
            await dummy.save();
        }
        
        const updated = await Attendance.updateMany(
            { 'punchOut.remarks': 'Duty', date: { $regex: '^2026-06' } },
            { $set: { vehicle: dummy._id, dutyType: 'Staff' } }
        );
        
        console.log('Updated duties to OFFICE DUTY:', updated.modifiedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
