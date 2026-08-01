require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    const dateLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const f = await Fuel.findOne({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } });
    console.log(f);
    process.exit(0);
}

run().catch(console.error);
