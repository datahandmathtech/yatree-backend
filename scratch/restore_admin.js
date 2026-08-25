const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const User = require('../src/models/User');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('Connected to DB');
    
    const company = await Company.findOne({ name: 'Abhinandan Travels' });
    if (!company) {
        console.log('Company Abhinandan Travels not found');
        process.exit(1);
    }
    
    const admin = await User.findOne({ mobile: '@abhinandan' });
    if (admin) {
        admin.company = company._id;
        admin.role = 'Admin';
        await admin.save();
        console.log('Fixed @abhinandan user to be Admin for Abhinandan Travels');
    } else {
        console.log('Admin user not found');
    }
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
