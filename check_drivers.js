require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    const drivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    console.log('Total Drivers:', drivers.length);
    console.log(drivers.map(d => d.name).slice(0, 10));
    process.exit(0);
}

run().catch(console.error);
