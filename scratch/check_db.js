const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('Connected to DB');
    const total = await User.countDocuments({ role: 'Driver' });
    const active = await User.countDocuments({ role: 'Driver', status: 'active' });
    const blocked = await User.countDocuments({ role: 'Driver', status: 'blocked' });
    const deleted = await User.countDocuments({ role: 'Driver', status: 'deleted' });
    console.log(`Total Drivers: ${total}`);
    console.log(`Active Drivers: ${active}`);
    console.log(`Blocked Drivers: ${blocked}`);
    console.log(`Deleted Drivers: ${deleted}`);
    
    // Check drivers created in the last 48 hours
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const recent = await User.countDocuments({ role: 'Driver', createdAt: { $gte: twoDaysAgo } });
    console.log(`Drivers created in last 48 hrs: ${recent}`);

    // Check if there are drivers with no company
    const noCompany = await User.countDocuments({ role: 'Driver', company: { $exists: false } });
    console.log(`Drivers with no company: ${noCompany}`);

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
