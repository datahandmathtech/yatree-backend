require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const Attendance = mongoose.connection.db.collection('attendances');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const lalus = await User.find({ company: abhiId, name: { $regex: 'Lalu', $options: 'i' } }).toArray();
    for (let lalu of lalus) {
        console.log('Driver:', lalu.name, '| ID:', lalu._id);
        const count = await Attendance.countDocuments({ driver: lalu._id, date: { $regex: '^2026-06' } });
        console.log('  Attendances in June:', count);
    }
    
    process.exit(0);
}

run().catch(console.error);
