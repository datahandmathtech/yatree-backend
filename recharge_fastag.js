require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Vehicle = mongoose.connection.db.collection('vehicles');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const rechargeDate = new Date('2026-06-05T10:00:00Z');
    
    const vehicles = await Vehicle.find({ company: abhiId }).toArray();
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
        // Prepare the history object
        const historyEntry = {
            _id: new mongoose.Types.ObjectId(),
            amount: 2000,
            date: rechargeDate,
            method: 'System/Admin',
            remarks: 'June Fastag Recharge'
        };
        
        // Update balance and push history
        await Vehicle.updateOne(
            { _id: vehicle._id },
            { 
                $inc: { fastagBalance: 2000 },
                $push: { fastagHistory: historyEntry }
            }
        );
        updatedCount++;
    }
    
    console.log(`Successfully added ₹2000 Fastag recharge to ${updatedCount} vehicles for June 2026.`);
    
    process.exit(0);
}

run().catch(console.error);
