const xlsx = require('xlsx');

const workbook = xlsx.readFile('E:\\New folder\\sale (3).xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const driversToCheck = [
    "Banshi New",
    "Bhavarsing",
    "Kalyan Singh",
    "Nileshbhai",
    "Nepalsing",
    "Takhatsingh",
    "Sachin",
    "Rakesh (GuchiBhai)",
    "Lalu Shanker"
];

const normalize = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase();
const driverMap = {};
driversToCheck.forEach(d => driverMap[normalize(d)] = d);

const foundVehicles = {};

for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[4]) continue;
    const excelDriver = String(row[4]).trim();
    const nEx = normalize(excelDriver);
    
    // Check if nEx matches any of our target drivers
    for (const [nTarget, origName] of Object.entries(driverMap)) {
        if (nEx === nTarget || nEx.includes(nTarget) || nTarget.includes(nEx)) {
            if (!foundVehicles[origName]) foundVehicles[origName] = {};
            const vehicleRaw = row[0] ? String(row[0]).trim() : 'UNKNOWN';
            if (!foundVehicles[origName][vehicleRaw]) foundVehicles[origName][vehicleRaw] = 0;
            foundVehicles[origName][vehicleRaw]++;
        }
    }
}

console.log(JSON.stringify(foundVehicles, null, 2));
