require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.db.collection('users');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const dbDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    const dbVehicles = await Vehicle.find({ company: abhiId }).toArray();
    
    const workbook = xlsx.readFile('E:\\sale (2).xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    const excelDrivers = new Set();
    const excelVehicles = new Set();
    
    for (let i = 1; i < data.length; i++) {
        if (!data[i] || data[i].length === 0) continue;
        if (data[i][4]) excelDrivers.add(String(data[i][4]).trim());
        if (data[i][0]) excelVehicles.add(String(data[i][0]).trim());
    }
    
    console.log(`Excel Drivers: ${excelDrivers.size}`);
    console.log(`DB Drivers: ${dbDrivers.length}`);
    
    // Fuzzy match logic
    const normalize = (s) => String(s).replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const matchedDrivers = {};
    const unmatchedExcelDrivers = [];
    
    Array.from(excelDrivers).forEach(exD => {
        let nEx = normalize(exD);
        if (!nEx) return;
        
        let found = null;
        // Exact normalized match
        for (let db of dbDrivers) {
            let nDb = normalize(db.name);
            if (nDb === nEx || nEx.includes(nDb) || nDb.includes(nEx)) {
                // If it's a very short substring, ignore (e.g. len < 4)
                if (nDb.length >= 4 && nEx.length >= 4) {
                    found = db.name;
                    break;
                }
            }
        }
        
        if (found) {
            matchedDrivers[exD] = found;
        } else {
            unmatchedExcelDrivers.push(exD);
        }
    });
    
    console.log("Matched Drivers Sample:");
    console.log(Object.entries(matchedDrivers).slice(0, 10));
    console.log("Unmatched Excel Drivers:");
    console.log(unmatchedExcelDrivers.slice(0, 20));
    
    process.exit(0);
}

run().catch(console.error);
