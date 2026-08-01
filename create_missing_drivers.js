require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const existingDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    const normalizeDriver = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const workbook = xlsx.readFile('E:\\sale (2).xls');
    const sheet = workbook.Sheets['Attendence'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let createdCount = 0;
    
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const driverRaw = row[1] ? String(row[1]).trim() : '';
        if (!driverRaw) continue;
        
        let found = false;
        let nEx = normalizeDriver(driverRaw);
        if (nEx) {
            // Step 1: Try Exact Match
            for (let db of existingDrivers) {
                if (normalizeDriver(db.name) === nEx) {
                    found = true; break;
                }
            }
            // Step 2: Try Substring match
            if (!found) {
                for (let db of existingDrivers) {
                    let nDb = normalizeDriver(db.name);
                    if (nDb.includes(nEx) || nEx.includes(nDb)) {
                        if (Math.abs(nDb.length - nEx.length) <= 3 && nDb.length >= 3) {
                            found = true; break;
                        }
                    }
                }
            }
        }
        
        if (nEx && !found) {
            console.log("Missing Driver Found:", driverRaw);
            const newDriver = {
                name: driverRaw,
                mobile: '0000000000',
                role: 'Driver',
                company: abhiId,
                status: 'active',
                isFreelancer: false,
                salary: 0,
                dailyWage: 500,
                permissions: {
                    dashboard: true, liveFeed: true, logBook: true, driversService: true,
                    fleetOperations: true, buySell: true, vehiclesManagement: true,
                    staffManagement: true, manageAdmins: true, reports: true
                },
                documents: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = await User.insertOne(newDriver);
            existingDrivers.push({ _id: result.insertedId, name: driverRaw });
            createdCount++;
        }
    }
    
    console.log(`Successfully created ${createdCount} missing drivers.`);
    process.exit(0);
}

run().catch(console.error);
