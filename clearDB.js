const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearDB() {
    const destUri = process.env.MONGODB_URI;

    console.log("Connecting to destination...");
    const destClient = new MongoClient(destUri);
    await destClient.connect();
    const destDb = destClient.db();

    const collections = await destDb.listCollections().toArray();
    
    for (const col of collections) {
        if (col.name.startsWith('system.')) continue;
        console.log(`Clearing collection: ${col.name}`);
        const destCol = destDb.collection(col.name);
        await destCol.deleteMany({});
    }

    console.log("Database cleared completely (tables preserved)!");
    await destClient.close();
}

clearDB().catch(err => {
    console.error("Failed to clear DB:", err);
    process.exit(1);
});
