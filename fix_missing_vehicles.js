require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = mongoose.connection.db.collection('users');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // Get a default vehicle
    const defaultVehicle = await Vehicle.findOne({ company: abhiId });
    if (!defaultVehicle) {
        console.log("No vehicles found in DB.");
        process.exit(1);
    }
    
    const targetDriverNames = [
        "Banshi New", "Banshi (New)",
        "Bhavarsing",
        "Kalyan Singh",
        "Nileshbhai", "Nilesh Bhai",
        "Nepalsing",
        "Takhatsingh", "Takhat Singh",
        "Sachin",
        "Rakesh (GuchiBhai)",
        "Lalu Shanker"
    ];
    
    // Normalize function to find them
    const normalize = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const drivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    let updatedCount = 0;
    
    for (let dbDriver of drivers) {
        const nDb = normalize(dbDriver.name);
        
        let match = false;
        for (let target of targetDriverNames) {
            const nTarget = normalize(target);
            if (nDb === nTarget || nDb.includes(nTarget) || nTarget.includes(nDb)) {
                if (Math.abs(nDb.length - nTarget.length) <= 3 && nDb.length >= 3) {
                    match = true;
                    break;
                }
            }
        }
        
        if (match) {
            // Assign default vehicle if they don't have one, or if they have null
            await User.updateOne({ _id: dbDriver._id }, { $set: { assignedVehicle: defaultVehicle._id } });
            
            // Update their attendances
            const res = await Attendance.updateMany(
                { driver: dbDriver._id, date: { $regex: '^2026-06' } },
                { $set: { vehicle: defaultVehicle._id } }
            );
            
            console.log(`Updated ${dbDriver.name}: assigned ${defaultVehicle.carNumber || defaultVehicle.vehicleNumber} to ${res.modifiedCount} duties.`);
            updatedCount++;
        }
    }
    
    console.log(`Finished updating ${updatedCount} drivers.`);
    process.exit(0);
}

run().catch(console.error);
