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
    const driverNames = abhiDrivers.map(d => d.name).filter(n => n); // Get all string names
    
    // Add variations just in case (trimming)
    const driverNamesTrimmed = driverNames.map(n => n.trim());
    const allDriverNames = [...new Set([...driverNames, ...driverNamesTrimmed])];
    
    const vehicleIds = abhiVehicles.map(v => v._id);
    const vehicleNumbers = abhiVehicles.map(v => v.vehicleNumber).filter(n => n);
    
    console.log(`Found ${driverIds.length} Abhinandan Drivers and ${vehicleIds.length} Abhinandan Vehicles.`);
    
    const collectionsToUpdateDriver = ['attendances', 'advances', 'salaries'];
    const collectionsToUpdateBoth = ['fuels', 'maintenances', 'taxes', 'parking'];
    
    let totalMoved = 0;
    
    // DRY Run mode - set to false to actually update
    const dryRun = false;
    
    for (const collName of collectionsToUpdateDriver) {
        const coll = mongoose.connection.db.collection(collName);
        
        const filter = { 
            $or: [
                { driver: { $in: driverIds } },
                { driver: { $in: allDriverNames } }, // string match
                { driverName: { $in: allDriverNames } } 
            ],
            company: { $ne: abhiId }
        };
        
        if (dryRun) {
            const count = await coll.countDocuments(filter);
            console.log(`[DRY RUN] Would move ${count} records in '${collName}'.`);
        } else {
            const result = await coll.updateMany(filter, { $set: { company: abhiId } });
            console.log(`Moved ${result.modifiedCount} records in '${collName}' to Abhinandan.`);
            totalMoved += result.modifiedCount;
        }
    }
    
    for (const collName of collectionsToUpdateBoth) {
        const coll = mongoose.connection.db.collection(collName);
        
        const filter = { 
            $or: [
                { driver: { $in: driverIds } },
                { driver: { $in: allDriverNames } },
                { driverName: { $in: allDriverNames } },
                { vehicleId: { $in: vehicleIds } },
                { vehicle: { $in: vehicleIds } },
                { vehicleNumber: { $in: vehicleNumbers } }
            ],
            company: { $ne: abhiId }
        };
        
        if (dryRun) {
            const count = await coll.countDocuments(filter);
            console.log(`[DRY RUN] Would move ${count} records in '${collName}'.`);
        } else {
            const result = await coll.updateMany(filter, { $set: { company: abhiId } });
            console.log(`Moved ${result.modifiedCount} records in '${collName}' to Abhinandan.`);
            totalMoved += result.modifiedCount;
        }
    }
    
    console.log(`\nMigration Complete. Total records moved: ${totalMoved}`);
    process.exit(0);
}

run().catch(console.error);
