require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const Company = mongoose.connection.db.collection('companies');
    
    const users = await User.find({ role: { $in: ['Admin', 'SuperAdmin', 'Staff', 'admin', 'superadmin', 'staff', 'Superadmin'] } }).toArray();
    console.log('--- ADMIN/STAFF LOGINS ---');
    for (const u of users) {
        let compName = 'None';
        if (u.company) {
            const c = await Company.findOne({ _id: new mongoose.Types.ObjectId(u.company.toString()) });
            compName = c ? c.name : 'Unknown';
        }
        console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, CompanyID: ${u.company}, CompanyName: ${compName}`);
    }
    
    process.exit(0);
}

run().catch(console.error);
