require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const abhiFuels = await Fuel.find({ date: { $gte: start, $lte: end }, company: abhiId }).toArray();
    console.log(`Abhinandan June Fuels: ${abhiFuels.length}`);
    
    const abhiAtt = await Attendance.find({ date: { $gte: start, $lte: end }, company: abhiId }).toArray();
    console.log(`Abhinandan June Attendances: ${abhiAtt.length}`);
    
    // Also check if any data exists for Abhinandan AT ALL (not just June)
    const allAbhiFuels = await Fuel.countDocuments({ company: abhiId });
    console.log(`Total Abhinandan Fuels (all time): ${allAbhiFuels}`);
    
    const allAbhiAtt = await Attendance.countDocuments({ company: abhiId });
    console.log(`Total Abhinandan Attendances (all time): ${allAbhiAtt}`);
    
    process.exit(0);
}

run().catch(console.error);
