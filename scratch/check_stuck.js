const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

const Attendance = require('../src/models/Attendance');
const Company = require('../src/models/Company');
const User = require('../src/models/User'); // Required for populate

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const company = await Company.findOne({ name: 'YatreeDestination' });
    
    const stuck = await Attendance.find({ 
        company: company._id, 
        date: '2026-08-12', 
        status: 'incomplete' 
    }).populate('driver', 'name');

    console.log(`Found ${stuck.length} stuck drivers for 2026-08-12:`);
    for (const a of stuck) {
        console.log(`- ${a.driver.name} (Punch in: ${a.punchIn?.time})`);
        
        // Fix: Auto punch out 10 hours after punch in, or 8 PM if time missing
        a.status = 'completed';
        if (!a.punchOut) a.punchOut = {};
        
        if (a.punchIn && a.punchIn.time) {
            const punchOutTime = new Date(a.punchIn.time.getTime() + 10 * 60 * 60 * 1000); // 10 hours later
            a.punchOut.time = punchOutTime;
        } else {
            a.punchOut.time = new Date('2026-08-12T20:00:00.000Z');
        }
        a.punchOut.remarks = 'Auto-punched out due to server downtime';
        await a.save();
        console.log(`  -> Auto punched out at ${a.punchOut.time}`);
    }

    console.log('\nAll stuck drivers fixed.');
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
