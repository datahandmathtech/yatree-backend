require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    const Salary = mongoose.connection.db.collection('salaries');
    
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    // Check if there's any June fuel for Aalam, Arvind, Baby
    const names = ['Aalam', 'Arvind', 'Baby'];
    
    for (const name of names) {
        console.log(`\n--- Searching June data for ${name} ---`);
        const fuels = await Fuel.find({ date: { $gte: start, $lte: end }, $or: [{ driver: new RegExp(name, 'i') }, { driverName: new RegExp(name, 'i') }] }).toArray();
        console.log(`Fuels: ${fuels.length}`);
        
        const atts = await Attendance.find({ date: { $gte: start, $lte: end }, $or: [{ driver: new RegExp(name, 'i') }] }).toArray(); // Note: attendance usually uses ObjectId for driver. Let's check both string and ID
        console.log(`Attendances (string match): ${atts.length}`);
        
        // Find driver ObjectId
        const User = mongoose.connection.db.collection('users');
        const driverDoc = await User.findOne({ name: new RegExp(name, 'i') });
        if (driverDoc) {
            const attsById = await Attendance.find({ date: { $gte: start, $lte: end }, driver: driverDoc._id }).toArray();
            console.log(`Attendances (ID match): ${attsById.length}`);
            if (attsById.length > 0) {
                console.log(`Attendance 1 company: ${attsById[0].company}`);
            }
        }
    }
    
    process.exit(0);
}

run().catch(console.error);
