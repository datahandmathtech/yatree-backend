require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Attendance = mongoose.connection.db.collection('attendances');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // Delete ALL attendances in June 2026 for Abhinandan to ensure perfectly clean slate
    const result = await Attendance.deleteMany({ company: abhiId, date: { $regex: '^2026-06' } });
    console.log('Deleted all June attendances:', result.deletedCount);
    
    process.exit(0);
}

run().catch(console.error);
