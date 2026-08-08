require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = mongoose.connection.db.collection('users');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    const Attendance = mongoose.connection.db.collection('attendances');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // 1. Check if PRATAPSINH exists, otherwise create
    let pratap = await User.findOne({ company: abhiId, name: { $regex: '^PRATAPSINH', $options: 'i' } });
    if (!pratap) {
        console.log("PRATAPSINH not found. Creating...");
        const result = await User.insertOne({
            name: 'Pratapsinh',
            mobile: '0000000000', // Dummy mobile
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
        });
        pratap = { _id: result.insertedId, name: 'Pratapsinh' };
    } else {
        console.log("PRATAPSINH found in DB:", pratap.name);
    }
    
    // 2. Read vehicles to map by exact or normalized name
    const existingVehicles = await Vehicle.find({ company: abhiId }).toArray();
    const normalizeString = (str) => {
        if (!str) return '';
        return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    };
    const vehicleMap = {}; 
    existingVehicles.forEach(v => {
        if (v.carNumber) vehicleMap[normalizeString(v.carNumber)] = v._id;
        if (v.vehicleNumber) vehicleMap[normalizeString(v.vehicleNumber)] = v._id;
    });

    // 3. Read Sale (3).xls and filter for PRATAPSINH
    const workbook = xlsx.readFile('E:\\New folder\\sale (3).xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let attendancesToInsert = [];
    
    // Headers: "Vehicle", "Model", "Starting", "Type of Duty", "Driver", "Vendor"
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const vehicleRaw = row[0] ? String(row[0]).trim() : '';
        const dateRaw = row[2];
        const driverRaw = row[4] ? String(row[4]).trim() : '';
        
        if (!driverRaw) continue;
        
        // Match PRATAPSINH (ignore case and spaces)
        if (driverRaw.replace(/[^a-zA-Z]/g, '').toLowerCase() === 'pratapsinh') {
            const vehicleNorm = normalizeString(vehicleRaw);
            const vehicleId = vehicleMap[vehicleNorm] || null;
            
            let dateObj;
            if (typeof dateRaw === 'number') {
                dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
            } else if (typeof dateRaw === 'string') {
                dateObj = new Date(dateRaw);
            } else {
                continue;
            }
            
            if (isNaN(dateObj.getTime())) continue;
            
            if (dateObj.getFullYear() === 2026 && dateObj.getMonth() === 5) {
                const dateStr = dateObj.toISOString().split('T')[0];
                const punchOutTime = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
                
                attendancesToInsert.push({
                    company: abhiId,
                    vehicle: vehicleId,
                    driver: pratap._id,
                    date: dateStr,
                    status: 'completed',
                    punchIn: { time: dateObj, km: 0 },
                    punchOut: { time: punchOutTime, km: 0, remarks: `Duty with ${vehicleRaw}` },
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
    
    console.log(`Found ${attendancesToInsert.length} duty records for PRATAPSINH in June 2026.`);
    
    if (attendancesToInsert.length > 0) {
        // Optionally delete existing June attendances for Pratapsinh to avoid duplicates
        const delRes = await Attendance.deleteMany({
            company: abhiId,
            driver: pratap._id,
            date: { $regex: '^2026-06' }
        });
        console.log(`Deleted ${delRes.deletedCount} old duties for PRATAPSINH.`);
        
        const result = await Attendance.insertMany(attendancesToInsert);
        console.log(`Successfully inserted ${result.insertedCount} duty records for PRATAPSINH!`);
    } else {
        console.log("No valid duty records found in June for PRATAPSINH.");
    }
    
    process.exit(0);
}

run().catch(console.error);
