const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const User = require('../src/models/User');
const Company = require('../src/models/Company');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('Connected to DB');
    
    // Find all users who are Admin or SuperAdmin
    const admins = await User.find({ role: { $in: ['Admin', 'SuperAdmin'] } }).populate('company');
    for (const a of admins) {
        console.log(`User: ${a.name}, Mobile: ${a.mobile}, Role: ${a.role}, Company: ${a.company ? a.company.name : 'None'}`);
    }

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
