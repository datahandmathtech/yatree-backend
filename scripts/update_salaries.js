const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = require('../src/models/Attendance');
        const User = require('../src/models/User');

        const companyId = '6a6ae0b1c21904a20a92919a';
        const today = new Date();
        today.setHours(0,0,0,0);

        // Find all attendances created today
        const attendances = await Attendance.find({ 
            company: companyId, 
            createdAt: { $gte: today } 
        });

        console.log(`Found ${attendances.length} entries to update.`);

        let updateCount = 0;

        for (const att of attendances) {
            const driver = await User.findById(att.driver);
            if (driver) {
                // Determine daily wage: use driver.dailyWage, or fallback to salary/30
                const wage = driver.dailyWage > 0 ? driver.dailyWage : (driver.salary > 0 ? Math.round(driver.salary / 30) : 0);
                
                if (wage > 0) {
                    att.dailyWage = wage;
                    await att.save();
                    updateCount++;
                }
            }
        }

        console.log(`Successfully updated dailyWage for ${updateCount} entries.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
