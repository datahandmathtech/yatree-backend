const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Attendance = require('../src/models/Attendance');
    const User = require('../src/models/User');
    const chandu = await User.findOne({name: { $regex: /chandu/i }});
    const duties = await Attendance.find({driver: chandu._id}).sort({date:-1}).limit(5);
    duties.forEach(d => console.log(d.date, d.punchIn?.time, d.punchOut?.time, d.punchOut?.remarks));
    process.exit(0);
}
run();
