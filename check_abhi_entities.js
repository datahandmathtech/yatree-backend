require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const abhiDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    console.log(`Abhinandan Drivers (in users): ${abhiDrivers.length}`);
    for(const d of abhiDrivers.slice(0,5)) console.log(' -', d.name);
    
    const abhiVehicles = await Vehicle.find({ company: abhiId }).toArray();
    console.log(`Abhinandan Vehicles: ${abhiVehicles.length}`);
    for(const v of abhiVehicles.slice(0,5)) console.log(' -', v.vehicleNumber);
    
    // Check if there are Fuels for these vehicles OR drivers under ANY company
    const driverIds = abhiDrivers.map(d => d._id);
    const vehicleIds = abhiVehicles.map(v => v._id);
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    const matchingFuels = await Fuel.countDocuments({
        date: { $gte: start, $lte: end },
        $or: [
            { driver: { $in: driverIds } },
            { vehicleId: { $in: vehicleIds } }
        ]
    });
    console.log(`June Fuels belonging to Abhi Drivers/Vehicles (regardless of company field): ${matchingFuels}`);
    
    process.exit(0);
}

run().catch(console.error);
