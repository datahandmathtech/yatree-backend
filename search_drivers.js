const xlsx = require('xlsx'); 
const workbook = xlsx.readFile('E:\\sale (2).xls'); 
const targetDrivers = ['Bhavarsing', 'Kalyan Singh', 'Nileshbhai', 'Takhatsingh', 'Banshi New', 'Sachin', 'Nepalsing', 'Rakesh (GuchiBhai)', 'Lalu Shanker']; 
const normalize = (str) => String(str).replace(/[^a-zA-Z]/g, '').toLowerCase(); 

workbook.SheetNames.forEach(sheetName => { 
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }); 
    data.forEach((row, rowIndex) => { 
        row.forEach((cell, colIndex) => { 
            const nEx = normalize(cell); 
            targetDrivers.forEach(d => { 
                if (nEx === normalize(d)) { 
                    console.log(`Found ${d} in sheet [${sheetName}], row ${rowIndex}, col ${colIndex}: ${cell}`); 
                } 
            }); 
        }); 
    }); 
});
