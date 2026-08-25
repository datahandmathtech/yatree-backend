const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Fuel = require('../src/models/Fuel');
const Attendance = require('../src/models/Attendance');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const company = await Company.findOne({ name: 'YatreeDestination' });
    
    const fuels = await Fuel.find({ company: company._id }).sort({ date: -1 }).limit(10);
    console.log('Recent Fuel Dates:');
    fuels.forEach(f => console.log(f.date, f.createdAt));

    const atts = await Attendance.find({ company: company._id }).sort({ date: -1 }).limit(10);
    console.log('\nRecent Attendance Dates:');
    atts.forEach(a => console.log(a.date, a.createdAt));

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
