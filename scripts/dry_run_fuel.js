const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Vehicle = require('../src/models/Vehicle');
    const companyId = '6a6ae0b1c21904a20a92919a';
    
    const dbVehicles = await Vehicle.find({ company: companyId });
    
    const wb = xlsx.readFile('E:/diesel.xls');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    const matched = new Map();
    const unmatched = new Set();
    
    for(let r=0; r<rows.length; r++) {
        const row = rows[r];
        if(!row || !row.length) continue;
        const col0 = String(row[0] || '').trim();
        
        // Skip obvious header rows or empty ones
        if (col0 === 'Slip No.' || col0 === 'ABHINANDAN TRAVELS AND LOGISTIC PRIVATE LIMITED' || col0 === 'Total') continue;
        
        // If col0 is a number (like Slip No.), it's a data row
        if (!isNaN(col0) && col0 !== '') continue;

        // If we reach here, it's likely a car header (e.g. "0061 CHASSIS NUMBER (Diesel)")
        // but let's only consider it if it's not a known non-car string
        if (col0.toLowerCase().includes('opening balance') || col0.toLowerCase().includes('closing balance')) continue;

        if (col0.length > 3) {
            let matchedVehicle = null;
            for(const v of dbVehicles) {
                const num = String(v.carNumber || '').trim();
                if(!num) continue;
                
                const numClean = num.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const col0Clean = col0.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                
                if(col0Clean.includes(numClean)) {
                    matchedVehicle = v;
                    break;
                }
                
                const last4 = num.slice(-4);
                if(last4 && last4.length === 4 && /\d{4}/.test(last4) && col0.includes(last4)) {
                    matchedVehicle = v;
                    break;
                }
            }
            
            if(matchedVehicle) {
                matched.set(col0, matchedVehicle.carNumber);
            } else {
                // Might be a car not in our DB
                unmatched.add(col0);
            }
        }
    }
    
    console.log(`Matched Cars: ${matched.size}`);
    for (const [k, v] of matched.entries()) {
        console.log(`  ${k} -> ${v}`);
    }
    console.log(`Unmatched (Potentially cars not in DB): ${unmatched.size}`);
    
    process.exit(0);
}
run();
