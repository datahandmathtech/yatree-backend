const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

// Function to normalize strings for comparison (removes spaces, makes lowercase)
const normalize = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const driverMapping = {
    'banshinew': 'banshinew',
    'banshi': 'banshi',
    'fetehsinh': 'fetehsing',
    'harishbhai': 'harishbhai',
    'indresinh': 'indresing',
    'indersingh': 'indresing',
    'kalyeinsing': 'kalyeinsing',
    'kalyansingh': 'kalyeinsing',
    'kishen': 'kishen',
    'kishan': 'kishen',
    'laxmanrathod': 'laxmanrathod',
    'manjhi': 'manjhi',
    'manji': 'manjhi',
    'bhavarsingh': 'bhavarsing',
    'bhavarsinh': 'bhavarsing',
    'nepalsinh': 'nepalsing',
    'takhatsinh': 'takhatsingh',
    'rakeshgucchibhai': 'rakeshgucchibhai',
    'rakeshguchibhai': 'rakeshgucchibhai',
    'lalushanker': 'lalshankar'
};

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('../src/models/User');
        const Attendance = require('../src/models/Attendance');
        const Vehicle = require('../src/models/Vehicle');

        console.log('Reading Excel sheet...');
        const wb = xlsx.readFile('E:/sale (2).xls');
        const sheet = wb.Sheets['Attendence'];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const absentDatesMap = {};

        // Parse Excel rows
        for (let r = 2; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length < 3) continue;
            
            const rawName = row[1];
            if (!rawName) continue;
            
            const searchDriver = normalize(rawName);
            const absentDays = [];
            
            // Days 1 to 30 correspond to columns 2 to 31
            for (let i = 1; i <= 30; i++) {
                const val = row[i + 1];
                // If it's explicitly 0 or empty/falsy
                if (val === 0 || !val || val === 'A' || val === 'a') {
                    absentDays.push(i);
                }
            }
            
            absentDatesMap[searchDriver] = absentDays;
        }

        console.log(`Parsed ${Object.keys(absentDatesMap).length} drivers from Excel.`);

        const drivers = await User.find({ company: '6a6ae0b1c21904a20a92919a', role: 'Driver' });
        const allDuties = await Attendance.find({
            date: { $regex: '^2026-06' }
        });

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
                console.log(`Driver not found in DB: ${searchDriver}`);
                continue;
            }

            const presentDays = [];
            for (let i = 1; i <= 30; i++) {
                if (!absentDays.includes(i)) presentDays.push(i);
            }

            const driverDuties = allDuties.filter(d => d.driver.toString() === driver._id.toString());
            const invalidDuties = driverDuties.filter(d => {
                const day = parseInt(d.date.split('-')[2]);
                return absentDays.includes(day);
            });

            const currentDutyDays = driverDuties.map(d => parseInt(d.date.split('-')[2]));
            const missingDutyDays = presentDays.filter(day => !currentDutyDays.includes(day));

            for (const invDuty of invalidDuties) {
                if (missingDutyDays.length > 0) {
                    const nextMissing = missingDutyDays.shift();
                    const newDate = `2026-06-${String(nextMissing).padStart(2, '0')}T00:00:00.000Z`;
                    await Attendance.findByIdAndUpdate(invDuty._id, { date: newDate });
                    dutiesMoved++;
                } else {
                    await Attendance.findByIdAndDelete(invDuty._id);
                    dutiesDeleted++;
                }
            }

            if (missingDutyDays.length > 0) {
                let defaultVehicle = null;
                if (driverDuties.length > 0) {
                    const counts = {};
                    let maxCount = 0;
                    for (const d of driverDuties) {
                        if (!d.vehicle) continue;
                        const vStr = d.vehicle.toString();
                        counts[vStr] = (counts[vStr] || 0) + 1;
                        if (counts[vStr] > maxCount) {
                            maxCount = counts[vStr];
                            defaultVehicle = d.vehicle;
                        }
                    }
                }
                
                if (!defaultVehicle) {
                    const dv = await Vehicle.findOne({ company: '6a6ae0b1c21904a20a92919a' });
                    if (dv) defaultVehicle = dv._id;
                }

                for (const day of missingDutyDays) {
                    const newDate = `2026-06-${String(day).padStart(2, '0')}T00:00:00.000Z`;
                    
                    const dateObj = new Date(newDate);
                    const punchInTime = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
                    const punchOutTime = new Date(punchInTime.getTime() + (8 * 60 * 60 * 1000));

                    await Attendance.create({
                        driver: driver._id,
                        vehicle: defaultVehicle,
                        company: '6a6ae0b1c21904a20a92919a',
                        date: newDate,
                        punchIn: { time: punchInTime },
                        punchOut: { time: punchOutTime, remarks: 'Duty' },
                        status: 'completed',
                        dutyType: 'Local',
                        salesCount: 0,
                        openingKm: 0,
                        closingKm: 0,
                        totalKm: 0,
                        wageTotal: 0,
                        fuelAmount: 0,
                        tollTax: 0,
                        advance: 0,
                        remarks: 'System Auto Present (Excel)',
                        isOutsideCar: false
                    });
                    dutiesCreated++;
                }
            }
        }

        console.log('--- EXCEL SYNC COMPLETE ---');
        console.log(`Duties Moved: ${dutiesMoved}`);
        console.log(`Extra Duties Deleted: ${dutiesDeleted}`);
        console.log(`New Duties Created: ${dutiesCreated}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
