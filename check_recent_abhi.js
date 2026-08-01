require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    const Salary = mongoose.connection.db.collection('salaries');
    const Advance = mongoose.connection.db.collection('advances');
    
    const dateLimit = new Date(Date.now() - 72 * 60 * 60 * 1000); // Check last 72 hours just to be safe
    const limitObjId = mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000);
    
    const fuels = await Fuel.find({ company: abhiId, _id: { $gt: limitObjId } }).toArray();
    const atts = await Attendance.find({ company: abhiId, _id: { $gt: limitObjId } }).toArray();
    const sals = await Salary.find({ company: abhiId, _id: { $gt: limitObjId } }).toArray();
    const advs = await Advance.find({ company: abhiId, _id: { $gt: limitObjId } }).toArray();
    
    console.log(`Abhinandan Data Added in Last 72 Hours:`);
    console.log(`- Fuels: ${fuels.length}`);
    console.log(`- Attendances: ${atts.length}`);
    console.log(`- Salaries: ${sals.length}`);
    console.log(`- Advances: ${advs.length}`);
    
    process.exit(0);
}

run().catch(console.error);
