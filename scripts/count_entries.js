const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Attendance = require('../src/models/Attendance');
    
    // Total count for company
    const totalCount = await Attendance.countDocuments({ company: '6a6ae0b1c21904a20a92919a' });
    
    // Count created today
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayCount = await Attendance.countDocuments({ company: '6a6ae0b1c21904a20a92919a', createdAt: { $gte: today } });
    
    console.log('Total entries in DB for company:', totalCount);
    console.log('Entries added by me (Script) today:', todayCount);
    
    process.exit(0);
}
run();
