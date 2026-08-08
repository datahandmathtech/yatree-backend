require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const abhiFuels = await Fuel.find({ company: abhiId }).sort({ date: -1 }).toArray();
    console.log(`Total Abhinandan Fuels: ${abhiFuels.length}`);
    for(const f of abhiFuels.slice(0,5)) console.log(` - Date: ${f.date}, Amount: ${f.amount}, Vehicle: ${f.vehicleId}`);
    
    const abhiAtt = await Attendance.find({ company: abhiId }).sort({ date: -1 }).toArray();
    console.log(`Total Abhinandan Attendances: ${abhiAtt.length}`);
    for(const a of abhiAtt.slice(0,5)) console.log(` - Date: ${a.date}, Driver: ${a.driver}`);
    
    process.exit(0);
}

run().catch(console.error);
