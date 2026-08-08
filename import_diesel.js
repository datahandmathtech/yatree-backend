require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Fuel = mongoose.connection.db.collection('fuels');
    const Vehicle = mongoose.connection.db.collection('vehicles');
    
    const abhiId = new mongoose.Types.ObjectId('6a6ae0b1c21904a20a92919a');
    
    // Fetch all existing vehicles for Abhinandan
    const existingVehicles = await Vehicle.find({ company: abhiId }).toArray();
    
    const normalizeString = (str) => {
        if (!str) return '';
        return String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    };
    
    const vehicleMap = {}; // normalized excel name -> ObjectId
    existingVehicles.forEach(v => {
        if (v.carNumber) vehicleMap[normalizeString(v.carNumber.replace('(Diesel)', ''))] = v._id;
        if (v.vehicleNumber) vehicleMap[normalizeString(v.vehicleNumber.replace('(Diesel)', ''))] = v._id;
    });
    
    const workbook = xlsx.readFile('E:\\diesel.xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let currentVehicleRaw = null;
    let currentVehicleId = null;
    
    let fuelsToInsert = [];
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const firstCol = row[0] ? String(row[0]).trim() : '';
        
        // Detect vehicle header
        if (firstCol && firstCol !== 'Slip No.' && !firstCol.match(/^\d+\/\d+/) && firstCol !== 'ABHINANDAN TRAVELS AND LOGISTIC PRIVATE LIMITED' && row[1] == null) {
            currentVehicleRaw = firstCol;
            let norm = normalizeString(currentVehicleRaw.replace('(Diesel)', ''));
            
            if (vehicleMap[norm]) {
                currentVehicleId = vehicleMap[norm];
            } else {
                // If not found, create a placeholder vehicle
                const newVehicle = {
                    _id: new mongoose.Types.ObjectId(),
                    company: abhiId,
                    carNumber: currentVehicleRaw,
                    vehicleNumber: currentVehicleRaw,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    model: 'Imported',
                    status: 'Active'
                };
                await Vehicle.insertOne(newVehicle);
                vehicleMap[norm] = newVehicle._id;
                currentVehicleId = newVehicle._id;
                console.log(`Created missing vehicle: ${currentVehicleRaw}`);
            }
            continue;
        }
        
        // Detect data row
        if (typeof row[1] === 'number' && typeof row[5] === 'number' && currentVehicleId) {
            const excelDate = row[1];
            const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            
            // Only June 2026 data
            if (date.getFullYear() === 2026 && date.getMonth() === 5) {
                
                const quantity = Number(row[5]) || 0;
                const rate = Number(row[8]) || (Number(row[9]) / quantity) || 0;
                const amount = Number(row[9]) || (quantity * rate) || 0;
                const odo = Number(row[3]) || Number(row[2]) || 0;
                
                fuelsToInsert.push({
                    vehicle: currentVehicleId,
                    company: abhiId,
                    fuelType: 'Diesel',
                    date: date,
                    amount: amount,
                    quantity: quantity,
                    rate: rate,
                    odometer: odo,
                    stationName: row[10] ? String(row[10]).trim() : '',
                    paymentMode: 'Office',
                    paymentSource: 'Office',
                    driver: row[13] ? String(row[13]).trim() : 'Unknown',
                    paymentBy: 'Office',
                    distance: 0,
                    mileage: 0,
                    costPerKm: 0,
                    source: 'Admin',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
    }
    
    console.log(`Prepared ${fuelsToInsert.length} fuels for June 2026.`);
    
    if (fuelsToInsert.length > 0) {
        const result = await Fuel.insertMany(fuelsToInsert);
        console.log(`Successfully inserted ${result.insertedCount} fuel records for Abhinandan Travels!`);
    } else {
        console.log("No valid records found to insert.");
    }
    
    process.exit(0);
}

run().catch(console.error);
