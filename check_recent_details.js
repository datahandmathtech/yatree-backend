require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    const dateLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const fuels = await Fuel.find({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } }).toArray();
    fuels.forEach(f => console.log(f.driver, f.stationName, f.paymentBy, f.fuelType));
    process.exit(0);
}

run().catch(console.error);
