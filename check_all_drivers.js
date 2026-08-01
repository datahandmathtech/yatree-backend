require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const names = ['Aalam', 'Arvind', 'Baby'];
    
    for (const name of names) {
        console.log(`\n--- Searching ALL time data for ${name} ---`);
        const fuels = await Fuel.find({ $or: [{ driver: new RegExp(name, 'i') }, { driverName: new RegExp(name, 'i') }] }).toArray();
        console.log(`Total Fuels: ${fuels.length}`);
        
        const User = mongoose.connection.db.collection('users');
        const driverDoc = await User.findOne({ name: new RegExp(name, 'i') });
        if (driverDoc) {
            const attsById = await Attendance.find({ driver: driverDoc._id }).toArray();
            console.log(`Total Attendances (ID match): ${attsById.length}`);
            if (attsById.length > 0) {
                console.log(` Sample Att dates: ${attsById.slice(0,3).map(a => a.date).join(', ')}`);
            }
        }
    }
    
    process.exit(0);
}

run().catch(console.error);
