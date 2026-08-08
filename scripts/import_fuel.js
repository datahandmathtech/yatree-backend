const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = require('../src/models/Vehicle');
        const Fuel = require('../src/models/Fuel');
        const companyId = '6a6ae0b1c21904a20a92919a';
        
        console.log('Loading DB vehicles...');
        const dbVehicles = await Vehicle.find({ company: companyId });
        
        console.log('Reading Excel file...');
        const wb = xlsx.readFile('E:/diesel.xls');
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        let currentDbVehicle = null;
        let fuelEntriesCreated = 0;
        let unmatchedHeaders = new Set();
        let matchedHeaders = new Set();
        
        for(let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if(!row || !row.length) continue;
            
            const col0 = String(row[0] || '').trim();
            if(!col0) continue;
            
            // Check if it's a car header
            const headerMatch = col0.match(/^(.*?)\s*\((Diesel|Petrol|CNG)\)$/i);
            
            if (headerMatch) {
                const rawCarName = headerMatch[1].trim();
                const fuelType = headerMatch[2]; // Diesel, Petrol, CNG
                
                let matchedVehicle = null;
                const rawClean = rawCarName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const last4 = rawClean.slice(-4);
                
                for (const v of dbVehicles) {
                    const num = String(v.carNumber || '').trim();
                    if (!num) continue;
                    
                    const numClean = num.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const vLast4 = numClean.slice(-4);
                    
                    // Exact match
                    if (rawClean === numClean || rawClean.includes(numClean) || numClean.includes(rawClean)) {
                        matchedVehicle = v;
                        break;
                    }
                    
                    // Match by last 4 digits
                    if (last4 && last4.length === 4 && /\d{4}/.test(last4) && vLast4 === last4) {
                        matchedVehicle = v;
                        break;
                    }
                }
                
                if (matchedVehicle) {
                    currentDbVehicle = matchedVehicle;
                    matchedHeaders.add(col0);
                } else {
                    currentDbVehicle = null;
                    unmatchedHeaders.add(col0);
                }
                continue; // Move to fuel data rows
            }
            
            // It's not a car header. Is it a fuel row?
            // A fuel row typically has Slip No in col0 (which is a number or string), Date in col1 (number), Liter in col5, Rate in col7, Amount in col8.
            const excelDate = row[1];
            const liter = row[5];
            const rate = row[8];
            const amount = row[9];
            const pump = row[10] || '';
            const notes = row[11] || '';
            const driverName = row[13] || 'Unknown';
            
            // Validate it's a fuel row for a MATCHED vehicle
            if (currentDbVehicle && excelDate && typeof excelDate === 'number' && typeof amount === 'number' && amount > 0) {
                // Parse date
                // Excel base date is 1900-01-01 (1) or 1904. Assuming 1900.
                const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                let finalDate = jsDate;
                
                if (typeof notes === 'string' && notes.includes(':')) {
                    // Try parsing DD-MM-YYYY HH:mm:ss
                    const parts = notes.split(' ');
                    if (parts.length >= 2) {
                        const dparts = parts[0].split('-');
                        if (dparts.length === 3) {
                            const dateStr = `${dparts[2]}-${dparts[1]}-${dparts[0]}T${parts[1]}.000Z`;
                            const parsed = new Date(dateStr);
                            if (!isNaN(parsed.getTime())) {
                                finalDate = parsed;
                            }
                        }
                    }
                }
                
                // Add to DB
                await Fuel.create({
                    vehicle: currentDbVehicle._id,
                    company: companyId,
                    fuelType: 'Diesel', // Hardcoding as it's a diesel file
                    date: finalDate,
                    amount: Number(amount) || 0,
                    quantity: Number(liter) || 0,
                    rate: Number(rate) || 0,
                    odometer: 0, // Request from user
                    stationName: pump,
                    driver: driverName,
                    paymentMode: 'Office',
                    paymentSource: 'Office'
                });
                
                fuelEntriesCreated++;
            }
        }
        
        console.log(`Matched Cars in Excel: ${matchedHeaders.size}`);
        console.log(`Unmatched Cars in Excel: ${unmatchedHeaders.size}`);
        console.log(`--- SUCCESSFULLY CREATED ${fuelEntriesCreated} FUEL ENTRIES ---`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
