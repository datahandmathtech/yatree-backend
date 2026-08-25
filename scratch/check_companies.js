const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const User = require('../src/models/User');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('Connected to DB');
    
    const companies = await Company.find({});
    console.log('Companies:', companies.map(c => ({id: c._id, name: c.name})));

    const admin = await User.findOne({ mobile: '@abhinandan' });
    console.log('Admin user company:', admin ? admin.company : 'Not found');

    const driversByCompany = await User.aggregate([
        { $match: { role: 'Driver' } },
        { $group: { _id: '$company', count: { $sum: 1 } } }
    ]);
    console.log('Drivers by company:', driversByCompany);

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
