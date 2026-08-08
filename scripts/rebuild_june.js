const mongoose = require('mongoose');
const { execSync } = require('child_process');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = require('../src/models/Attendance');
        
        console.log('Wiping all June 2026 duties...');
        const result = await Attendance.deleteMany({ date: { $regex: '^2026-06' } });
        console.log(`Deleted ${result.deletedCount} duties.`);
        
        await mongoose.disconnect();
        
        console.log('Running import_sale_duties.js...');
        execSync('node scripts/import_sale_duties.js', { stdio: 'inherit' });
        
        console.log('Running sync_excel_matrix.js...');
        execSync('node scripts/sync_excel_matrix.js', { stdio: 'inherit' });
        
        console.log('Running update_salaries.js...');
        execSync('node scripts/update_salaries.js', { stdio: 'inherit' });
        
        console.log('--- COMPLETELY REBUILT JUNE ATTENDANCE ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
