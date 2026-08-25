const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Vehicle = require('../src/models/Vehicle');
const Attendance = require('../src/models/Attendance');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    // We will do this for all vehicles to be safe, not just YatreeDestination
    const vehicles = await Vehicle.find({ currentDriver: { $ne: null } });
    console.log(`Found ${vehicles.length} vehicles with a currentDriver set.`);
    
    let fixedCount = 0;
    for (const v of vehicles) {
        // Check if there is an INCOMPLETE attendance for this vehicle
        const activeAtt = await Attendance.findOne({ 
            vehicle: v._id, 
            status: 'incomplete' 
        });

        if (!activeAtt) {
            // No active attendance, but currentDriver is set! The vehicle is stuck.
            v.currentDriver = null;
            await v.save();
            console.log(`Cleared stuck currentDriver for Vehicle: ${v.carNumber}`);
            fixedCount++;
        }
    }

    console.log(`\nSuccessfully cleared ${fixedCount} stuck vehicles.`);
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
