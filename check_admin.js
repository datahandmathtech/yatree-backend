require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const allUsers = await User.find({}).toArray();
    for (const u of allUsers) {
        if (u.name && u.name.toLowerCase().includes('yatree') || u.role) {
            console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Company: ${u.company}`);
            console.log('Allowed Companies:', u.allowedCompanies);
        }
    }
    process.exit(0);
}

run().catch(console.error);
