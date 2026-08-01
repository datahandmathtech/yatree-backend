require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const Parking = require('./src/models/Parking');
const Company = require('./src/models/Company');
const Vehicle = require('./src/models/Vehicle');

const parseNumber = (val) => {
    if (!val) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const company = await Company.findOne({ name: /Abhinandan/i });
        if (!company) throw new Error("No company found for Abhinandan Travels");

        // Clean up wrong attendances created for the first company
        const firstCompany = await Company.findOne();
        if (firstCompany && firstCompany._id.toString() !== company._id.toString()) {
            await Attendance.deleteMany({ company: firstCompany._id, status: 'completed', isPunchedOut: true });
        }

        const drivers = await User.find({ role: 'Driver' });
        const driverMap = new Map();
        drivers.forEach(d => {
            driverMap.set(d.name.toLowerCase().trim(), d);
        });

        const workbook = xlsx.readFile('C:\\Users\\ABHAY\\OneDrive\\Documents\\Downloads\\sale (4).xls');
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('da and night') || s.toLowerCase().includes('parking'));
        
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
        
        let updatedAttendanceCount = 0;
        let createdAttendanceCount = 0;
        let createdParkingCount = 0;
        let updatedParkingCount = 0;

        for (let r = 2; r < data.length; r++) {
            const row = data[r];
            if (!row || !row[1]) continue;

            const driverName = row[1].toString().trim().toLowerCase();
            let driver = driverMap.get(driverName);
            
            // Fuzzy match if not found
            if (!driver) {
                driver = drivers.find(d => {
                    const dbName = d.name.toLowerCase().trim();
                    if (dbName === 'bhavar singh' && driverName === 'bhawar singh') return true;
                    if (dbName === 'bhawar singh' && driverName === 'bhavar singh') return true;
                    return dbName.includes(driverName) || driverName.includes(dbName);
                });
            }

            if (!driver) {
                console.log(`Driver not found in DB: ${row[1]}`);
                continue;
            }

            for (let day = 1; day <= 30; day++) {
                const da = parseNumber(row[2 + (day - 1) * 3]);
                const park = parseNumber(row[3 + (day - 1) * 3]);
                const nyt = parseNumber(row[4 + (day - 1) * 3]);

                if (da > 0 || nyt > 0 || park > 0) {
                    const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
                    try {
                        if (da > 0 || nyt > 0) {
                            let att = await Attendance.findOne({ driver: driver._id, date: dateStr });
                            if (att) {
                                if (!att.punchOut) att.punchOut = {};
                                att.punchOut.allowanceTA = da;
                                att.punchOut.nightStayAmount = nyt;
                                await att.save();
                                updatedAttendanceCount++;
                            } else {
                                // Find a default vehicle for this driver, or just get any vehicle
                            let defaultVehicle = await Vehicle.findOne();
                            if (!defaultVehicle) {
                                defaultVehicle = new Vehicle({
                                    vehicleNo: 'RJ-XX-DUMMY',
                                    type: 'Sedan',
                                    brand: 'Unknown',
                                    company: company._id
                                });
                                await defaultVehicle.save({ validateBeforeSave: false });
                            }
                                await Attendance.create({
                                    company: company._id,
                                    driver: driver._id,
                                    vehicle: defaultVehicle ? defaultVehicle._id : new mongoose.Types.ObjectId(),
                                    date: dateStr,
                                    punchIn: { time: new Date(`${dateStr}T09:00:00.000Z`) },
                                    punchOut: { 
                                        time: new Date(`${dateStr}T18:00:00.000Z`),
                                        allowanceTA: da, 
                                        nightStayAmount: nyt 
                                    },
                                    dailyWage: driver.dailyWage || 0,
                                    status: 'completed',
                                    isPunchedOut: true
                                });
                                createdAttendanceCount++;
                            }
                        }

                        if (park > 0) {
                            let parking = await Parking.findOne({ driverId: driver._id, date: dateStr });
                            if (parking) {
                                parking.amount = park;
                                parking.isApproved = true;
                                await parking.save();
                                updatedParkingCount++;
                            } else {
                                await Parking.create({
                                    company: company._id,
                                    driverId: driver._id,
                                    driver: driver.name,
                                    date: dateStr,
                                    amount: park,
                                    vehicleNo: 'UNKNOWN',
                                    location: 'Imported',
                                    isApproved: true
                                });
                                createdParkingCount++;
                            }
                        }
                    } catch (err) {
                        console.error(`Error processing ${driverName} on ${dateStr}:`, err.message);
                    }
                }
            }
        }

        console.log(`\nImport Summary:`);
        console.log(`Updated Attendances: ${updatedAttendanceCount}`);
        console.log(`Created Attendances: ${createdAttendanceCount}`);
        console.log(`Updated Parkings: ${updatedParkingCount}`);
        console.log(`Created Parkings: ${createdParkingCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

// First clean up wrong imported parkings, then run
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        await Parking.deleteMany({ location: 'Imported' });
        console.log('Cleaned up previous incorrect parkings.');
        await run();
    });
