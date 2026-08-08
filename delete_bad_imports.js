require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Fuel = mongoose.connection.db.collection('fuels');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // Delete the recently imported records. I'll use ObjectId timestamp.
    const dateLimit = new Date(Date.now() - 30 * 60 * 1000);
    const limitObjId = mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000);
    
    const result = await Fuel.deleteMany({ company: abhiId, _id: { $gt: limitObjId } });
    console.log('Deleted records:', result.deletedCount);
    
    process.exit(0);
}

run().catch(console.error);
