const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Attendance = require('../src/models/Attendance');
const Event = require('../src/models/Event');
const Fuel = require('../src/models/Fuel');
const DRSDuty = require('../src/models/DRSDuty');
const Vehicle = require('../src/models/Vehicle');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('Connected to DB');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const checkCollection = async (model, name) => {
        const total = await model.countDocuments({});
        const recent = await model.countDocuments({ createdAt: { $gte: twoDaysAgo } });
        console.log(`${name}: Total=${total}, Last 48 hrs=${recent}`);
    };

    await checkCollection(Attendance, 'Attendance');
    await checkCollection(Event, 'Event');
    await checkCollection(Fuel, 'Fuel');
    await checkCollection(DRSDuty, 'DRSDuty');
    await checkCollection(Vehicle, 'Vehicle');
    await checkCollection(User, 'User');
    
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
