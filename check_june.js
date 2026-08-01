require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Company = mongoose.connection.db.collection('companies');
    const abhinandan = await Company.findOne({ name: /Abhinandan/i });
    console.log('Abhinandan ID:', abhinandan ? abhinandan._id.toString() : 'Not found');
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const start = new Date('2026-06-01T00:00:00Z');
    const end = new Date('2026-06-30T23:59:59Z');
    
    const oldFuels = await Fuel.find({ date: { $gte: start, $lte: end } }).toArray();
    console.log(`Found ${oldFuels.length} total fuels in June`);
    
    const oldAtt = await Attendance.find({ date: { $gte: start, $lte: end } }).toArray();
    console.log(`Found ${oldAtt.length} total attendances in June`);
    
    if (oldFuels.length > 0) {
        console.log('Sample Fuel company field type:', typeof oldFuels[0].company, 'value:', oldFuels[0].company);
        const wrongFuels = await Fuel.countDocuments({ date: { $gte: start, $lte: end }, company: 'Logkaro' });
        console.log(`June fuels with company="Logkaro": ${wrongFuels}`);
        const nullFuels = await Fuel.countDocuments({ date: { $gte: start, $lte: end }, company: { $exists: false } });
        console.log(`June fuels with NO company: ${nullFuels}`);
    }
    
    if (oldAtt.length > 0) {
        console.log('Sample Att company field type:', typeof oldAtt[0].company, 'value:', oldAtt[0].company);
        const wrongAtt = await Attendance.countDocuments({ date: { $gte: start, $lte: end }, company: 'Logkaro' });
        console.log(`June att with company="Logkaro": ${wrongAtt}`);
    }
    
    process.exit(0);
}

run().catch(console.error);
