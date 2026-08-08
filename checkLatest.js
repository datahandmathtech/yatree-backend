const mongoose = require('mongoose');
require('dotenv').config();
const Vehicle = require('./src/models/Vehicle');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const all = await Vehicle.find({});
    console.log(`Total vehicles in DB: ${all.length}`);
    all.forEach(v => {
        console.log(`- ID: ${v._id}, Car Number: ${v.carNumber}, isOutside: ${v.isOutsideCar}, Owner: ${v.ownerName}`);
    });
    process.exit(0);
});
