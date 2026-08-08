require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const Attendance = mongoose.connection.db.collection('attendances');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // Find both Fatehsinghs
    const oldFetehsing = await User.findOne({ company: abhiId, mobile: '7889653265' });
    const newFatehsingh = await User.findOne({ company: abhiId, mobile: '0000000000', name: 'Fatehsingh' });
    
    if (oldFetehsing && newFatehsingh) {
        // Move attendances
        const res = await Attendance.updateMany(
            { driver: newFatehsingh._id },
            { $set: { driver: oldFetehsing._id } }
        );
        console.log(`Moved ${res.modifiedCount} duties from new Fatehsingh to old Fetehsing.`);
        
        // Delete the new dummy one
        await User.deleteOne({ _id: newFatehsingh._id });
        console.log(`Deleted the duplicate 'Fatehsingh'.`);
        
        // Also update oldFetehsing's name to correct spelling if needed?
        await User.updateOne({ _id: oldFetehsing._id }, { $set: { name: 'Fatehsingh' } });
        console.log(`Updated old driver's name spelling to 'Fatehsingh'.`);
    } else {
        console.log("Could not find both drivers.");
    }
    
    process.exit(0);
}

run().catch(console.error);
