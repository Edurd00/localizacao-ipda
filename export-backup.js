const fs = require('fs');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

async function runBackup() {
  let records = [];

  if (databaseUrl) {
    console.log("DATABASE_URL found. Connecting to Postgres database on Neon DB...");
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const client = await pool.connect();
    try {
      console.log("Querying all rows and columns from 'igrejas' table...");
      const res = await client.query('SELECT * FROM igrejas ORDER BY desc_igreja ASC');
      records = res.rows;
      console.log(`Successfully retrieved ${records.length} records from database.`);
    } catch (err) {
      console.error("Error during database export:", err);
      process.exit(1);
    } finally {
      client.release();
      await pool.end();
    }
  } else {
    console.log("DATABASE_URL is not defined. Extracting fallback memory database records from src/lib/db.ts...");
    try {
      const dbContent = fs.readFileSync('src/lib/db.ts', 'utf8');
      // Find the memoryDb array block in db.ts
      const match = dbContent.match(/let memoryDb:\s*Igreja\[\]\s*=\s*([\s\S]*?);/);
      if (match) {
        // Evaluate the JS array string safely
        const arrayStr = match[1];
        // Clean comments
        const cleanStr = arrayStr.replace(/\/\/.*$/gm, '');
        // Evaluate it as standard JS
        const evalFn = new Function(`return ${cleanStr};`);
        records = evalFn();
        console.log(`Successfully extracted ${records.length} fallback records from memoryDb.`);
      } else {
        console.error("Could not locate memoryDb array inside src/lib/db.ts");
      }
    } catch (err) {
      console.error("Error parsing memoryDb from src/lib/db.ts:", err);
    }
  }

  // Save to backup_igrejas_completo.json
  const outputPath = 'backup_igrejas_completo.json';
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
  console.log(`Backup successfully saved to ${outputPath}`);
}

runBackup();
