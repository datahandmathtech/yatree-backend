const xlsx = require('xlsx');

function run() {
    const workbook = xlsx.readFile('E:\\diesel.xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let currentVehicle = null;
    const records = [];
    
    // Find the header row to know columns, typically row 1 (0-indexed is 0, wait, it was row 1 in previous output)
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // If the first cell starts with something that looks like a Vehicle Group Header
        const firstCol = row[0] ? String(row[0]).trim() : '';
        
        if (firstCol.includes('CHASSIS NUMBER') || firstCol.match(/^[A-Z0-9]{4,}/)) {
            // It might be a vehicle header if it doesn't look like a slip number or date
            // Let's be more specific. In the previous output, Slip No is typically a number like "485/6", or empty.
            if (firstCol !== 'Slip No.' && !firstCol.match(/^\d+\/\d+/) && firstCol !== 'ABHINANDAN TRAVELS AND LOGISTIC PRIVATE LIMITED') {
                currentVehicle = firstCol;
                continue;
            }
        }
        
        // Check if it's a data row
        // Data row has Date (col 1), Liter (col 5), Rate (col 7), Amount (col 8)
        // Let's use indices from the header: 0=Slip, 1=Date, 5=Liter, 7=Rate, 8=Amount, 9=Pump, 10=Notes, 12=Employee
        // Let's check row[1] if it's a number (Excel date)
        if (typeof row[1] === 'number' && typeof row[5] === 'number') {
            
            // Excel dates start from Jan 1, 1900.
            const excelDate = row[1];
            const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            
            records.push({
                vehicleString: currentVehicle,
                slipNo: row[0],
                date: date,
                liter: row[5],
                rate: row[7],
                amount: row[8],
                pump: row[9],
                notes: row[10],
                employee: row[12]
            });
        }
    }
    
    console.log(`Parsed ${records.length} records.`);
    if (records.length > 0) {
        console.log("Sample of first 3:");
        console.log(records.slice(0, 3));
    }
}

run();
