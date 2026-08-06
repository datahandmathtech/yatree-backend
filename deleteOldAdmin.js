const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deleteOldAdmin() {
    const destUri = process.env.MONGODB_URI;
    const destClient = new MongoClient(destUri);
    await destClient.connect();
    const destDb = destClient.db();
    
    await destDb.collection('users').deleteOne({ mobile: 'admin_user_1' });
    console.log("Old admin_user_1 deleted.");
    await destClient.close();
}

deleteOldAdmin().catch(console.error);
