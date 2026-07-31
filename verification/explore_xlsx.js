const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('Reclassificação - Remapeamento Finalizado.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Total rows:', rows.length);
  // Find rows that look like church data (where row starts with a number or contains a numeric Codigo)
  let foundChurches = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0] && !isNaN(row[0]) && String(row[0]).trim() !== '') {
      foundChurches++;
      if (foundChurches <= 10) {
        console.log(`Church row ${i}:`, row);
      }
    }
  }
  console.log('Total valid numeric church rows found in first sheet:', foundChurches);
} catch (err) {
  console.error('Error reading xlsx:', err);
}
