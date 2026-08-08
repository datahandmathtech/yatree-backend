const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

const Company = require('../src/models/Company');
const Vehicle = require('../src/models/Vehicle');
const User = require('../src/models/User'); // Driver
const Attendance = require('../src/models/Attendance');

const excelSerialToDate = (serial) => {
    // Excel epoch is 1899-12-30
    const epoch = new Date(1899, 11, 30);
    // Multiply serial by ms in a day
    const date = new Date(epoch.getTime() + Math.round(serial * 86400000));
    return date;
};

const normalizeStr = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const superAdminUser = await User.findOne({ username: '@abhinandantravels' });
        if (!superAdminUser) {
            console.error('Super Admin User @abhinandantravels not found');
            process.exit(1);
        }
        const companyId = superAdminUser.company;
        console.log(`Company ID found via User: ${companyId}`);

        const wb = xlsx.readFile('E:\\\\sale (2).xls');
        const sheetName = 'Cut paste';
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
        console.log(`Found ${rows.length} rows in excel sheet.`);

        const vehicles = await Vehicle.find({ company: companyId });
        const drivers = await User.find({ company: companyId });

        let successCount = 0;
        let duplicateCount = 0;
        const missingDrivers = new Map();
        const missingVehicles = new Map();

        const driverMapping = {
            'bhavarsinh': 'bhavarsing',
            'pratapsinh': 'pratapsingh',
            'harishraval': 'harishbhai',
            'manjipatel': 'manjhi',
            'kalyansinh': 'kalyeinsing',
            'nepalsinh': 'nepalsing',
            'indrasinh': 'indresing',
            'lalshankr': 'lalshankar',
            'gangji': 'kanji',
            'takhatsinh': 'takhatsingh',
            'kishan': 'kishen'
        };

        for (const row of rows) {
            const rawVehicle = row['Vehicle'];
            const rawDriver = row['Driver'];
            const startingSerial = row['Starting'];
            const dutyType = row['Type of Duty'] || 'Local';

            if (!rawVehicle || !rawDriver || !startingSerial) continue;

            const searchVehicle = normalizeStr(rawVehicle);
            let searchDriver = normalizeStr(rawDriver);
            
            if (driverMapping[searchDriver]) {
                searchDriver = normalizeStr(driverMapping[searchDriver]);
            }

            const excelCarDigits = rawVehicle.replace(/\\D/g, '');
            const excelLast4 = excelCarDigits.length >= 4 ? excelCarDigits.slice(-4) : excelCarDigits;

            let vehicle = vehicles.find(v => {
                const baseCarNum = v.carNumber ? v.carNumber.split('#')[0] : '';
                return normalizeStr(baseCarNum) === searchVehicle;
            });

            if (!vehicle && excelLast4.length >= 3) {
                vehicle = vehicles.find(v => {
                    const baseCarNum = v.carNumber ? v.carNumber.split('#')[0] : '';
                    const dbCarDigits = baseCarNum.replace(/\\D/g, '');
                    const dbLast4 = dbCarDigits.length >= 4 ? dbCarDigits.slice(-4) : dbCarDigits;
                    return dbLast4 === excelLast4;
                });
            }

            let driver = drivers.find(d => {
                const roleMatch = (d.role || '').toLowerCase() === 'driver';
                const nameMatch = normalizeStr(d.name) === searchDriver || normalizeStr(d.username) === searchDriver;
                return roleMatch && nameMatch;
            });

            if (!driver && searchDriver.length >= 3) {
                driver = drivers.find(d => {
                    if ((d.role || '').toLowerCase() !== 'driver') return false;
                    const dbName = normalizeStr(d.name);
                    const dbUser = normalizeStr(d.username);
                    if (dbName && (dbName.includes(searchDriver) || searchDriver.includes(dbName))) return true;
                    if (dbUser && (dbUser.includes(searchDriver) || searchDriver.includes(dbUser))) return true;
                    return false;
                });
            }

            if (!vehicle) {
                missingVehicles.set(rawVehicle, (missingVehicles.get(rawVehicle) || 0) + 1);
                continue;
            }
            if (!driver) {
                missingDrivers.set(rawDriver, (missingDrivers.get(rawDriver) || 0) + 1);
                continue;
            }

            const punchInTime = excelSerialToDate(startingSerial);
            const punchOutTime = new Date(punchInTime.getTime() + (8 * 60 * 60 * 1000)); // 8 hours later
            const istDate = new Date(punchInTime.getTime() + (5.5 * 60 * 60 * 1000));
            const dateStr = istDate.toISOString().split('T')[0];

            const existing = await Attendance.findOne({
                vehicle: vehicle._id,
                driver: driver._id,
                date: dateStr
            });

            if (existing) {
                duplicateCount++;
                continue;
            }
            // Create Duty completed with 0 km
            const newDuty = new Attendance({
                company: companyId,
                driver: driver._id,
                vehicle: vehicle._id,
                date: dateStr,
                dutyType: dutyType,
                status: 'completed',
                punchIn: {
                    time: punchInTime,
                    km: 0
                },
                punchOut: {
                    time: punchOutTime,
                    km: 0,
                    remarks: 'Duty'
                },
                totalKM: 0,
                dailyWage: 0,
                dutyCount: 1
            });

            await newDuty.save();
            successCount++;
        }

        console.log(`\\nSummary of Missing Data:`);
        console.log(`- Duplicates Skipped: ${duplicateCount}`);
        console.log(`- New Success (if saved): ${successCount}`);
        
        console.log(`\\n--- MISSING VEHICLES ---`);
        for (const [v, count] of missingVehicles.entries()) {
            console.log(`[Missing] Vehicle: ${v} (Failed ${count} times)`);
        }
        
        console.log(`\\n--- MISSING DRIVERS ---`);
        for (const [d, count] of missingDrivers.entries()) {
            console.log(`[Missing] Driver: ${d} (Failed ${count} times)`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
