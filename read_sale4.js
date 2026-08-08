const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('C:\\Users\\ABHAY\\OneDrive\\Documents\\Downloads\\sale (4).xls');
    const sheetNameMatch = workbook.SheetNames.find(s => s.toLowerCase().includes('da and night') || s.toLowerCase().includes('parking'));
    
    if (sheetNameMatch) {
        console.log("Reading sheet:", sheetNameMatch);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameMatch], { header: 1, defval: null });
        console.log("First 5 rows (raw array):");
        for (let i = 0; i < 5; i++) {
            console.log(data[i]);
        }
    }
} catch (e) {
    console.error(e.message);
}
