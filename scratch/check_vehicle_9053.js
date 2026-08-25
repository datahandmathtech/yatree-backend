const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Vehicle = require('../src/models/Vehicle');
const Attendance = require('../src/models/Attendance');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const company = await Company.findOne({ name: 'YatreeDestination' });
    
    // Find vehicle with 9053 in carNumber
    const vehicles = await Vehicle.find({ 
        company: company._id, 
        carNumber: { $regex: '9053', $options: 'i' } 
    });

    console.log(`Found ${vehicles.length} vehicles matching 9053:`);
    for (const v of vehicles) {
        console.log(`- ID: ${v._id}, Car Number: ${v.carNumber}, Status: ${v.status}, isOutsideCar: ${v.isOutsideCar}`);
        
        // Check if there is an active attendance for this vehicle today or generally
        const activeAtt = await Attendance.findOne({ 
            vehicle: v._id, 
            status: 'incomplete' 
        }).populate('driver', 'name');
        
        if (activeAtt) {
            console.log(`  -> Currently assigned to: ${activeAtt.driver.name} (Punch in: ${activeAtt.punchIn?.time})`);
        } else {
            console.log('  -> Not currently assigned in any active shift.');
        }
    }

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
