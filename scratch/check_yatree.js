const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Fuel = require('../src/models/Fuel');
const Attendance = require('../src/models/Attendance');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const company = await Company.findOne({ name: 'YatreeDestination' });
    if (!company) { console.log('Company not found'); return process.exit(1); }

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const recentFuel = await Fuel.countDocuments({ company: company._id, createdAt: { $gte: twoDaysAgo } });
    const recentAtt = await Attendance.countDocuments({ company: company._id, createdAt: { $gte: twoDaysAgo } });
    const lastFuel = await Fuel.findOne({ company: company._id }).sort({ createdAt: -1 });

    console.log(`YatreeDestination recent Fuel: ${recentFuel}`);
    console.log(`YatreeDestination recent Attendance: ${recentAtt}`);
    console.log(`Last Fuel entry createdAt: ${lastFuel ? lastFuel.createdAt : 'None'}`);

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
