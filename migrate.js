const { MongoClient } = require('mongodb');

async function migrate() {
    const sourceUri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    const destUri = "mongodb://abhinandan9822_db_user:bmRK2asB2WA9guOw@ac-crupkmd-shard-00-00.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-01.iienpcd.mongodb.net:27017,ac-crupkmd-shard-00-02.iienpcd.mongodb.net:27017/taxi-fleet?ssl=true&authSource=admin&retryWrites=true&w=majority";

    console.log("Connecting to source...");
    const sourceClient = new MongoClient(sourceUri);
    await sourceClient.connect();
    const sourceDb = sourceClient.db();

    console.log("Connecting to destination...");
    const destClient = new MongoClient(destUri);
    await destClient.connect();
    const destDb = destClient.db();

    console.log("Dropping destination database just to be sure it's clean...");
    await destDb.dropDatabase();

    const collections = await sourceDb.listCollections().toArray();
    
    for (const col of collections) {
        if (col.name.startsWith('system.')) continue;
        console.log(`Migrating collection: ${col.name}`);
        const sourceCol = sourceDb.collection(col.name);
        const destCol = destDb.collection(col.name);
        
        const count = await sourceCol.countDocuments();
        if (count > 0) {
            const cursor = sourceCol.find({});
            let batch = [];
            const BATCH_SIZE = 1000;
            let copied = 0;

            for await (const doc of cursor) {
                batch.push(doc);
                if (batch.length === BATCH_SIZE) {
                    await destCol.insertMany(batch);
                    copied += batch.length;
                    batch = [];
                }
            }
            if (batch.length > 0) {
                await destCol.insertMany(batch);
                copied += batch.length;
            }
            console.log(`Copied ${copied} documents.`);
        } else {
            console.log(`No documents in ${col.name}.`);
        }
    }

    // Now recreate indexes based on the backend schemas. 
    // Actually, Mongoose will recreate indexes when the backend starts up connected to the new DB.
    console.log("Migration complete!");
    await sourceClient.close();
    await destClient.close();
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
