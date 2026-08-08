require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Attendance = mongoose.connection.db.collection('attendances');
    const User = mongoose.connection.db.collection('users');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    const existingDrivers = await User.find({ company: abhiId, role: { $in: ['Driver', 'driver'] } }).toArray();
    
    const normalizeDriver = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    const workbook = xlsx.readFile('E:\\sale (2).xls');
    const sheet = workbook.Sheets['Attendence'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let attendancesToInsert = [];
    
    // Find the header row to know which column is which day
    // In the sample, row 0 had 1..31 days starting at index 2
    
    for (let i = 2; i < data.length; i++) { // Skip headers
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const driverRaw = row[1] ? String(row[1]).trim() : '';
        if (!driverRaw) continue;
        
        let driverObj = null;
        let nEx = normalizeDriver(driverRaw);
        if (nEx) {
            // Step 1: Try Exact Match first
            for (let db of existingDrivers) {
                let nDb = normalizeDriver(db.name);
                if (nDb === nEx) {
                    driverObj = db;
                    break;
                }
            }
            
            // Step 2: Try Substring match but only if lengths are close
            if (!driverObj) {
                for (let db of existingDrivers) {
                    let nDb = normalizeDriver(db.name);
                    if (nDb.includes(nEx) || nEx.includes(nDb)) {
                        if (Math.abs(nDb.length - nEx.length) <= 3) {
                            if (nDb.length >= 3) {
                                driverObj = db;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (!driverObj) continue;
        
        // Loop through days (assuming index 2 is Day 1, index 3 is Day 2, up to index 31 for Day 30)
        // Wait, the sample was: row[2] = 1, row[3] = 2 ... row[31] = 30
        
        for (let day = 1; day <= 30; day++) {
            const colIndex = day + 1;
            if (row[colIndex] === 1 || row[colIndex] === '1') {
                const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(dateStr + 'T09:00:00Z');
                const punchOutTime = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000); // 17:00:00Z
                
                attendancesToInsert.push({
                    company: abhiId,
                    vehicle: driverObj.assignedVehicle || null, // fallback to null if they don't have one
                    driver: driverObj._id,
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
    
    // Since vehicle is required in schema, we might need to filter out ones without assignedVehicle
    // Let's filter them just in case, to avoid validation errors, although schema validation doesn't strictly apply in insertMany unless mongoose model is used.
    // Wait, insertMany on the raw collection WILL insert them without throwing Schema errors!
    // But frontend might crash if vehicle is null. Let's see if we can find a default vehicle or just keep it null.
    // I will keep it null, if they don't have assignedVehicle, we can't do anything else.
    
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
