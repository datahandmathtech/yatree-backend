const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Vehicle = require('../src/models/Vehicle');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const v = await Vehicle.findById('6982f54e508a22188c61895b');
    console.log(v);
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
