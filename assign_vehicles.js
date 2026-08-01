require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Vehicle = mongoose.connection.db.collection('vehicles');
    const User = mongoose.connection.db.collection('users');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    const existingVehicles = await Vehicle.find({ company: abhiId }).toArray();
    const existingDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    
    const normalizeString = (str) => {
        if (!str) return '';
        return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    };
    
    const normalizeDriver = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const vehicleMap = {}; 
    existingVehicles.forEach(v => {
        if (v.carNumber) vehicleMap[normalizeString(v.carNumber)] = v._id;
        if (v.vehicleNumber) vehicleMap[normalizeString(v.vehicleNumber)] = v._id;
    });
    
    const workbook = xlsx.readFile('E:\\New folder\\sale (3).xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // driverId -> { vehicleId: count }
    const assignmentCounts = {};
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const vehicleRaw = row[0] ? String(row[0]).trim() : '';
        const dateRaw = row[2];
        const driverRaw = row[4] ? String(row[4]).trim() : '';
        
        if (typeof dateRaw !== 'number' || !vehicleRaw || !driverRaw) continue;
        
        const vehicleNorm = normalizeString(vehicleRaw);
        const vehicleId = vehicleMap[vehicleNorm];
        
        if (!vehicleId) continue;
        
        let driverId = null;
        let nEx = normalizeDriver(driverRaw);
        if (nEx) {
            for (let db of existingDrivers) {
                let nDb = normalizeDriver(db.name);
                if (nDb === nEx || nEx.includes(nDb) || nDb.includes(nEx)) {
                    if (nDb.length >= 3) {
                        driverId = db._id;
                        break;
                    }
                }
            }
        }
        
        if (vehicleId && driverId) {
            const excelDate = dateRaw;
            const dateObj = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            
            if (dateObj.getFullYear() === 2026 && dateObj.getMonth() === 5) {
                const dIdStr = driverId.toString();
                const vIdStr = vehicleId.toString();
                
                if (!assignmentCounts[dIdStr]) {
                    assignmentCounts[dIdStr] = {};
                }
                if (!assignmentCounts[dIdStr][vIdStr]) {
                    assignmentCounts[dIdStr][vIdStr] = 0;
                }
                assignmentCounts[dIdStr][vIdStr]++;
            }
        }
    }
    
    let updateCount = 0;
    
    // For each driver, find the max vehicle
    for (const [dIdStr, vehiclesCounts] of Object.entries(assignmentCounts)) {
        let maxCount = 0;
        let bestVehicle = null;
        
        for (const [vIdStr, count] of Object.entries(vehiclesCounts)) {
            if (count > maxCount) {
                maxCount = count;
                bestVehicle = vIdStr;
            }
        }
        
        if (bestVehicle) {
            const dObjId = new mongoose.Types.ObjectId(dIdStr);
            const vObjId = new mongoose.Types.ObjectId(bestVehicle);
            
            await User.updateOne(
                { _id: dObjId },
                { $set: { assignedVehicle: vObjId } }
            );
            updateCount++;
        }
    }
    
    console.log(`Successfully assigned vehicles to ${updateCount} drivers!`);
    
    process.exit(0);
}

run().catch(console.error);
