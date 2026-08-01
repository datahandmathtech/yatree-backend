require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Company = mongoose.connection.db.collection('companies');
    const User = mongoose.connection.db.collection('users');
    
    const companies = await Company.find({}).toArray();
    console.log('--- ALL COMPANIES ---');
    for (const c of companies) {
        console.log(`ID: ${c._id}, Name: ${c.name}`);
    }
    
    const users = await User.find({ email: 'admin@yatree.com' }).toArray();
    console.log('\n--- ADMIN USER ---');
    for (const u of users) {
        console.log(`Email: ${u.email}, Name: ${u.name}, Company: ${u.company}, allowedCompanies:`, u.allowedCompanies);
    }
    
    process.exit(0);
}

run().catch(console.error);
