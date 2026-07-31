const mongoose = require('mongoose');
require('dotenv').config();

const absentDatesMap = {
    'arvind': [],
    'aalam': Array.from({length: 14}, (_, i) => i + 17), // 17-30 A
    'banshinew': [], 
    'banshi': [15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    'baby': [1, 2, 3, 4, 5, 6, 7, 8, 9, 24, 25, 29, 30],
    'bhavarsinh': Array.from({length: 23}, (_, i) => i + 8), // 8-30 A
    'bansu': [15],
    'chandu': [],
    'dinesh': Array.from({length: 18}, (_, i) => i + 1), // 1-18 A
    'fetehsinh': Array.from({length: 21}, (_, i) => i + 10), // 10-30 A
    'gopi': [8],
    'gopalmeena': [],
    'gopalrot': [1, 2, 3, 4],
    'harishbhai': [1],
    'hirabhai': [],
    'indresing': Array.from({length: 30}, (_, i) => i + 1), // All 30 days A
    'jashvant': Array.from({length: 15}, (_, i) => i + 1), // 1-15 A
    'jitu': [1, 2, 3, 4, 5, 6, 7, 8],
    'jivanbhai': [1, 2, 3, 4, 5, 6, 7],
    'kalyeinsing': [],
    'kishen': [],
    'laxmanrathod': Array.from({length: 12}, (_, i) => i + 19), // Grid 23: 19-30 A
    'lalu': Array.from({length: 7}, (_, i) => i + 24), // Grid 24: 24-30 A
    'lalshankar': [15], // Grid 25: 15 A
    'laxman': Array.from({length: 21}, (_, i) => i + 1), // Grid 26: 1-21 A
    'manjhi': Array.from({length: 9}, (_, i) => i + 1), // Grid 27: 1-9 A
    'kanti': [1, 2, 25, 26, 27], // Grid 28: 1-2, 25-27 A
    'mansi': [1, 2, 3], // Grid 29: 1-3 A
    'manilal': [], // Grid 30: All P
    'motisinh': [], // Grid 31: All P
    'mahendra': Array.from({length: 8}, (_, i) => i + 23), // Grid 32: 23-30 A
    'naresh': [29, 30], // Grid 33: 29-30 A
    'piyush': [15, 16], // Grid 34: 15-16 A
    'pradeep': [], // Grid 35: All P
    'rajendra': [15], // Grid 36: 15 A
    'ramlal': [], // Grid 37: All P
    'ranchod': [], // Grid 38: All P
    'rakeshgucchibhai': [29, 30], // Grid 39: 29-30 A
    'rajesh': Array.from({length: 16}, (_, i) => i + 15), // Grid 40: 15-30 A
    'rajni': [], // Grid 41: All P
    'rakeshpatel': Array.from({length: 17}, (_, i) => i + 14), // Grid 42: 14-30 A
    'sachin': [], // Grid 43: All P
    'sanjay': Array.from({length: 16}, (_, i) => i + 1), // Grid 44: 1-16 A
    'takhatsingh': Array.from({length: 21}, (_, i) => i + 10), // Grid 45: 10-30 A
    'vipul': [], // Grid 46: All P
    'nepalsing': [], // Grid 47: All P
    'nileshbhai': [] // Grid 48: All P
};

// Aliases and mappings
const driverMapping = {
    'banshinew': 'banshinew',
    'banshi': 'banshi',
    'fetehsinh': 'fetehsing',
    'harishbhai': 'harishbhai',
    'indresinh': 'indresing',
    'kalyeinsing': 'kalyeinsing',
    'kishen': 'kishen',
    'laxmanrathod': 'laxmanrathod', // DB might have spaces
    'manjhi': 'manjhi',
    'bhavarsinh': 'bhavarsing',
    'nepalsinh': 'nepalsing',
    'takhatsinh': 'takhatsingh',
    'rakeshgucchibhai': 'rakesh (gucchibhai)'
};

function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('../src/models/User');
        const Attendance = require('../src/models/Attendance');
        const Vehicle = require('../src/models/Vehicle');

        const companyId = '6a6ae0b1c21904a20a92919a';
        const drivers = await User.find({ company: companyId, role: 'Driver' });

        let dutiesMoved = 0;
        let dutiesDeleted = 0;
        let dutiesCreated = 0;

        for (const [searchDriver, absentDays] of Object.entries(absentDatesMap)) {
            const mappedName = normalize(driverMapping[searchDriver] || searchDriver);
            const driver = drivers.find(d => {
                const dbName = normalize(d.name);
                const dbUser = normalize(d.username || '');
                if (dbName === mappedName) return true;
                if (dbUser === mappedName) return true;
                return false;
            });

            if (!driver) {
                console.log('Driver not found:', searchDriver);
                continue;
            }

            const presentDays = [];
            for (let i = 1; i <= 30; i++) {
                if (!absentDays.includes(i)) presentDays.push(i);
            }

            // Fetch all June 2026 duties for this driver
            const duties = await Attendance.find({
                driver: driver._id,
                date: { $regex: '^2026-06' }
            }).sort({ date: 1 });

            // What days currently have duties?
            const currentDutyDays = new Set();
            duties.forEach(d => {
                const day = parseInt(d.date.split('-')[2], 10);
                currentDutyDays.add(day);
            });

            // Find duties that are on absent days (needs to be moved/deleted)
            const invalidDuties = duties.filter(d => {
                const day = parseInt(d.date.split('-')[2], 10);
                return absentDays.includes(day);
            });

            // Find present days that don't have duties
            const missingDutyDays = presentDays.filter(day => !currentDutyDays.has(day));

            let dummyVehicle = await Vehicle.findOne({ carNumber: /OFFICE/i });
            if (!dummyVehicle) {
                dummyVehicle = new Vehicle({ 
                    company: companyId, 
                    carNumber: 'OFFICE DUTY', 
                    model: 'N/A', 
                    status: 'active',
                    permitType: 'Local'
                });
                await dummyVehicle.save();
            }
            let defaultVehicle = dummyVehicle._id;
            const dailyWage = driver.dailyWage > 0 ? driver.dailyWage : (driver.salary > 0 ? Math.round(driver.salary / 30) : 0);

            // Move invalid duties to missing days
            for (const duty of invalidDuties) {
                if (missingDutyDays.length > 0) {
                    const nextMissing = missingDutyDays.shift();
                    const newDateStr = `2026-06-${String(nextMissing).padStart(2, '0')}`;
                    duty.date = newDateStr;
                    // Also update punchIn/Out if needed, but date string is primary
                    duty.dailyWage = dailyWage;
                    await duty.save();
                    dutiesMoved++;
                } else {
                    await Attendance.findByIdAndDelete(duty._id);
                    dutiesDeleted++;
                }
            }

            // Create new duties for any remaining missing days
            if (defaultVehicle) {
                for (const missingDay of missingDutyDays) {
                    const newDateStr = `2026-06-${String(missingDay).padStart(2, '0')}`;
                    
                    const newDuty = new Attendance({
                        company: companyId,
                        driver: driver._id,
                        vehicle: defaultVehicle,
                        date: newDateStr,
                        dutyType: 'Local',
                        status: 'completed',
                        punchIn: { time: new Date(`${newDateStr}T10:00:00Z`), km: 0 },
                        punchOut: { time: new Date(`${newDateStr}T18:00:00Z`), km: 0, remarks: 'Duty' },
                        totalKM: 0,
                        dailyWage: dailyWage,
                        dutyCount: 1
                    });
                    await newDuty.save();
                    dutiesCreated++;
                }
            }
        }

        console.log('--- SYNC COMPLETE ---');
        console.log(`Duties Moved to correct dates: ${dutiesMoved}`);
        console.log(`Extra Duties Deleted (absent days): ${dutiesDeleted}`);
        console.log(`New Duties Created (present days): ${dutiesCreated}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
