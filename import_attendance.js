require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Attendance = mongoose.connection.db.collection('attendances');
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
    
    // Build driver fuzzy matcher
    const fuzzyDriverMap = {};
    const workbook = xlsx.readFile('E:\\sale (2).xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let attendancesToInsert = [];
    
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
                    // Match found
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
                const dateStr = dateObj.toISOString().split('T')[0];
                const punchOutTime = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000); // Add 8 hours
                
                attendancesToInsert.push({
                    company: abhiId,
                    vehicle: vehicleId,
                    driver: driverId,
                    date: dateStr,
                    status: 'completed',
                    punchIn: { time: dateObj, km: 0 },
                    punchOut: { time: punchOutTime, km: 0, remarks: 'Duty' },
                    totalKM: 0,
                    dailyWage: 500,
                    dutyCount: 1,
                    fuel: { filled: false, amount: 0, entries: [] },
                    parking: [],
                    outsideTrip: { occurred: false, bonusAmount: 0 },
                    pendingExpenses: [],
                    createdAt: dateObj,
                    updatedAt: dateObj
                });
            }
        }
    }
    
    console.log(`Prepared ${attendancesToInsert.length} attendance records after fuzzy matching.`);
    
    if (attendancesToInsert.length > 0) {
        const result = await Attendance.insertMany(attendancesToInsert);
        console.log(`Successfully inserted ${result.insertedCount} attendance records!`);
    } else {
        console.log("No valid matching records found to insert.");
    }
    
    process.exit(0);
}

run().catch(console.error);
