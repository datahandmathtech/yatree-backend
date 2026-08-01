require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    
    // Check fuels created in the last 48 hours
    const dateLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentFuels = await Fuel.find({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } }).toArray();
    
    console.log(`Fuels created in last 48 hours: ${recentFuels.length}`);
    for(const f of recentFuels.slice(0, 10)) {
        console.log(` - Date: ${f.date}, Amount: ${f.amount}, Company: ${f.company}, Vehicle: ${f.vehicleId}`);
    }
    
    const Attendance = mongoose.connection.db.collection('attendances');
    const recentAtt = await Attendance.find({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } }).toArray();
    
    console.log(`Attendances created in last 48 hours: ${recentAtt.length}`);
    for(const a of recentAtt.slice(0, 10)) {
        console.log(` - Date: ${a.date}, Driver: ${a.driver}, Company: ${a.company}`);
    }
    
    process.exit(0);
}

run().catch(console.error);
