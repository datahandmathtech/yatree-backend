require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const User = mongoose.connection.db.collection('users');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    
    const abhiDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    const abhiVehicles = await Vehicle.find({ company: abhiId }).toArray();
    
    const driverIds = abhiDrivers.map(d => d._id);
    const vehicleIds = abhiVehicles.map(v => v._id);
    
    console.log(`Found ${driverIds.length} Abhinandan Drivers and ${vehicleIds.length} Abhinandan Vehicles.`);
    
    const collectionsToUpdateDriver = ['attendances', 'advances', 'salaries'];
    const collectionsToUpdateBoth = ['fuels', 'maintenances', 'taxes', 'parking']; // taxes usually have vehicleId, parking has vehicleId
    
    let totalMoved = 0;
    
    for (const collName of collectionsToUpdateDriver) {
        const coll = mongoose.connection.db.collection(collName);
        const result = await coll.updateMany(
            { driver: { $in: driverIds }, company: { $ne: abhiId } },
            { $set: { company: abhiId } }
        );
        console.log(`Moved ${result.modifiedCount} records in '${collName}' to Abhinandan.`);
        totalMoved += result.modifiedCount;
    }
    
    for (const collName of collectionsToUpdateBoth) {
        const coll = mongoose.connection.db.collection(collName);
        // Sometimes vehicle ID field is 'vehicle', sometimes 'vehicleId'. Let's check both.
        const result = await coll.updateMany(
            { 
                $or: [
                    { driver: { $in: driverIds } },
                    { vehicleId: { $in: vehicleIds } },
                    { vehicle: { $in: vehicleIds } }
                ],
                company: { $ne: abhiId }
            },
            { $set: { company: abhiId } }
        );
        console.log(`Moved ${result.modifiedCount} records in '${collName}' to Abhinandan.`);
        totalMoved += result.modifiedCount;
    }
    
    console.log(`\nMigration Complete. Total records moved: ${totalMoved}`);
    process.exit(0);
}

run().catch(console.error);
