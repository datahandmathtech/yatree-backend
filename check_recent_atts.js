require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Attendance = mongoose.connection.db.collection('attendances');
    const dateLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const atts = await Attendance.find({ _id: { $gt: mongoose.Types.ObjectId.createFromTime(dateLimit.getTime() / 1000) } }).toArray();
    
    console.log(`Total Atts in last 48h: ${atts.length}`);
    
    const User = mongoose.connection.db.collection('users');
    
    for (const a of atts) {
        let dName = String(a.driver);
        try {
            const driverDoc = await User.findOne({ _id: new mongoose.Types.ObjectId(a.driver.toString()) });
            if (driverDoc) dName = driverDoc.name;
        } catch(e) {}
        console.log(`Date: ${a.date}, Driver: ${dName}, Company: ${a.company}`);
    }
    
    process.exit(0);
}

run().catch(console.error);
