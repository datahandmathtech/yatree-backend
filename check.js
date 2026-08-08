const mongoose = require('mongoose');
require('dotenv').config();
const Vehicle = require('./src/models/Vehicle');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const v = await Vehicle.findById('6a71a63130a0cb5ac3a1a977');
    console.log('Vehicle:', { carNumber: v?.carNumber, workBasis: v?.workBasis });
    process.exit(0);
});
