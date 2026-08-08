const xlsx = require('xlsx');

function run() {
    const workbook = xlsx.readFile('E:\\diesel.xls');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let vehicles = new Set();
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const firstCol = row[0] ? String(row[0]).trim() : '';
        
        if (firstCol && firstCol !== 'Slip No.' && !firstCol.match(/^\d+\/\d+/) && firstCol !== 'ABHINANDAN TRAVELS AND LOGISTIC PRIVATE LIMITED') {
            // It could be a vehicle if there's no date in col 1
            if (row[1] == null) {
                vehicles.add(firstCol);
            }
        }
    }
    
    console.log(Array.from(vehicles).slice(0, 15));
}

run();
