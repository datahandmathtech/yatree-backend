require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    const Salary = mongoose.connection.db.collection('salaries');
    
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    console.log("--- FUELS IN JUNE ---");
    const fuels = await Fuel.find({ date: { $gte: start, $lte: end } }).limit(5).toArray();
    for (const f of fuels) {
        console.log(`Driver: ${f.driver}, Vehicle: ${f.vehicleId || f.vehicle}, Company: ${f.company}, CreatedAt: ${f._id.getTimestamp()}`);
    }
    
    console.log("\n--- ATTENDANCES IN JUNE ---");
    const atts = await Attendance.find({ date: { $gte: start, $lte: end } }).limit(5).toArray();
    for (const a of atts) {
        console.log(`Driver: ${a.driver}, Company: ${a.company}, CreatedAt: ${a._id.getTimestamp()}`);
    }
    
    console.log("\n--- SALARIES IN JUNE ---");
    // Salary might not have 'date' but 'month' and 'year'
    const sals = await Salary.find({ month: '06', year: '2026' }).limit(5).toArray();
    if (sals.length === 0) {
        const sals2 = await Salary.find({ month: 5, year: 2026 }).limit(5).toArray(); // some use 0-indexed month
        for (const s of sals2) console.log(`Driver: ${s.driver}, Company: ${s.company}, CreatedAt: ${s._id.getTimestamp()}`);
    } else {
        for (const s of sals) console.log(`Driver: ${s.driver}, Company: ${s.company}, CreatedAt: ${s._id.getTimestamp()}`);
    }
    
    process.exit(0);
}

run().catch(console.error);
