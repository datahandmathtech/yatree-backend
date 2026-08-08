const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const vehicle = await db.collection('vehicles').find({'documents': {$ne: []}}).sort({_id: -1}).limit(1).toArray();
    if (vehicle.length > 0) {
        console.log("Documents:", JSON.stringify(vehicle[0].documents, null, 2));
    } else {
        console.log("No vehicle with documents found.");
    }
    await client.close();
}

run();
