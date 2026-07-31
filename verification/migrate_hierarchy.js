const XLSX = require('xlsx');
const { Pool } = require('pg');

function getPorte(desc) {
  const normalized = (desc || '').toUpperCase();
  if (normalized.includes('ESTADUAL')) return 'ESTADUAL';
  if (normalized.includes('SETORIAL')) return 'SETORIAL';
  if (normalized.includes('CENTRAL')) return 'CENTRAL';
  if (normalized.includes('REGIONAL')) return 'REGIONAL';
  if (
    normalized.includes('CASA DE ORAÇÃO') ||
    normalized.includes('CASA DE ORACOA') ||
    normalized.includes('ORAÇÃO') ||
    normalized.includes('ORACAO')
  ) {
    return 'CASA DE ORAÇÃO';
  }
  if (
    normalized.includes('ALDEIA') ||
    normalized.includes('INDIGENA') ||
    normalized.includes('INDÍGENA')
  ) {
    return 'ALDEIA INDIGENA';
  }
  return 'LOCAL';
}

async function main() {
  console.log('--- MIGRATION SCRIPT FOR IPDA HIERARCHY ---');

  const databaseUrl = process.env.DATABASE_URL;
  let pool = null;

  if (databaseUrl) {
    console.log('Database connection detected!');
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    console.warn('DATABASE_URL is not set. Running in DRY-RUN mode (logging only)...');
  }

  try {
    const workbook = XLSX.readFile('Reclassificação - Remapeamento Finalizado.xlsx');
    console.log(`Successfully loaded sheets: ${workbook.SheetNames.join(', ')}`);

    let totalProcessed = 0;
    let totalUpdated = 0;

    // Loop through each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nProcessing Sheet: "${sheetName}"...`);
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Active parents stack
      const active_parents = {
        ESTADUAL: null,
        SETORIAL: null,
        CENTRAL: null,
        REGIONAL: null
      };

      let sheetProcessed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawCode = row[0];
        // Check if rawCode is a valid numeric TOTVS code
        if (rawCode === undefined || rawCode === null || isNaN(rawCode) || String(rawCode).trim() === '') {
          continue;
        }

        const codigo_totvs = String(rawCode).trim();
        const rawDesc = row[7] || '';
        const porte = getPorte(rawDesc);

        let codigo_totvs_pai = null;

        if (porte === 'ESTADUAL') {
          codigo_totvs_pai = null;
          active_parents.ESTADUAL = codigo_totvs;
          active_parents.SETORIAL = null;
          active_parents.CENTRAL = null;
          active_parents.REGIONAL = null;
        } else if (porte === 'SETORIAL') {
          codigo_totvs_pai = active_parents.ESTADUAL;
          active_parents.SETORIAL = codigo_totvs;
          active_parents.CENTRAL = null;
          active_parents.REGIONAL = null;
        } else if (porte === 'CENTRAL') {
          codigo_totvs_pai = active_parents.SETORIAL || active_parents.ESTADUAL;
          active_parents.CENTRAL = codigo_totvs;
          active_parents.REGIONAL = null;
        } else if (porte === 'REGIONAL') {
          codigo_totvs_pai = active_parents.CENTRAL || active_parents.SETORIAL || active_parents.ESTADUAL;
          active_parents.REGIONAL = codigo_totvs;
        } else {
          // LOCAL / CASA DE ORAÇÃO / ALDEIA INDIGENA
          codigo_totvs_pai = active_parents.REGIONAL || active_parents.CENTRAL || active_parents.SETORIAL || active_parents.ESTADUAL;
        }

        sheetProcessed++;
        totalProcessed++;

        // Print first 5 records of each sheet for manual validation of logic correctness
        if (sheetProcessed <= 5) {
          console.log(`  Row ${i} | Code: ${codigo_totvs.padEnd(6)} | Porte: ${porte.padEnd(16)} | Parent: ${String(codigo_totvs_pai).padEnd(6)} | Name: ${row[1]}`);
        }

        // Execute DB Update if pool is connected
        if (pool) {
          try {
            await pool.query(
              `UPDATE igrejas
               SET codigo_totvs_pai = $1, porte = $2
               WHERE codigo_totvs = $3`,
              [codigo_totvs_pai, porte, codigo_totvs]
            );
            totalUpdated++;
          } catch (dbErr) {
            console.error(`  Error updating church ${codigo_totvs}:`, dbErr.message);
          }
        }
      }

      console.log(`Finished processing sheet "${sheetName}": ${sheetProcessed} churches structured.`);
    }

    console.log(`\n--- SUMMARY ---`);
    console.log(`Total churches processed: ${totalProcessed}`);
    if (pool) {
      console.log(`Total records successfully updated in Neon DB: ${totalUpdated}`);
    } else {
      console.log(`Dry-run validation complete. Logic is fully working!`);
    }

  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
