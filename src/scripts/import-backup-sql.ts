import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Supabase...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  console.log('Connected successfully!');

  try {
    // 1. Recreate table structure to match requirements exactly
    console.log('Dropping existing table "igrejas" if any...');
    await client.query('DROP TABLE IF EXISTS public.igrejas CASCADE;');

    console.log('Creating table "igrejas" with requested schema...');
    await client.query(`
      CREATE TABLE public.igrejas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo_totvs VARCHAR(100) UNIQUE NOT NULL,
        desc_igreja VARCHAR(255) NOT NULL,
        tipo_imovel VARCHAR(100),
        endereco TEXT,
        bairro VARCHAR(100),
        municipio VARCHAR(100),
        estado VARCHAR(50),
        cep VARCHAR(20),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        link_google_maps TEXT,
        status VARCHAR(50) DEFAULT 'PENDENTE',
        validado_por VARCHAR(100),
        validado_em TIMESTAMP WITH TIME ZONE,
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        usuario_validador VARCHAR(100),
        codigo_totvs_pai VARCHAR(100),
        porte VARCHAR(50)
      );
    `);
    console.log('Table "igrejas" created successfully.');

    // 2. Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'igrejas_202608031504.sql');
    console.log(`Reading SQL backup from ${sqlFilePath}...`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL by "INSERT INTO public.igrejas"
    const splitToken = 'INSERT INTO public.igrejas';
    const parts = sqlContent.split(splitToken);

    // The first part is everything before the first INSERT statement (should be empty or whitespace)
    const statements: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      const statement = (splitToken + parts[i]).trim();
      if (statement) {
        statements.push(statement);
      }
    }

    console.log(`Found ${statements.length} INSERT blocks in the SQL file.`);

    // 3. Execute INSERT blocks in batches
    console.log('Starting mass data import into Supabase...');
    const totalBlocks = statements.length;
    let successCount = 0;

    for (let i = 0; i < totalBlocks; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        successCount++;
        if (successCount % 100 === 0 || successCount === totalBlocks) {
          console.log(`Progress: Imported ${successCount}/${totalBlocks} blocks...`);
        }
      } catch (err: any) {
        console.error(`Error executing block ${i + 1}:`, err.message);
        console.error(`Statement snippet: ${stmt.substring(0, 200)}...`);
        throw err;
      }
    }

    console.log('Import complete!');

    // 4. Run post-import verification queries
    console.log('\n--- VERIFICATION ---');
    const countRes = await client.query('SELECT COUNT(*) FROM public.igrejas;');
    const totalRecords = countRes.rows[0].count;
    console.log(`Total churches imported: ${totalRecords}`);

    const validatedCountRes = await client.query("SELECT COUNT(*) FROM public.igrejas WHERE status = 'VALIDADO';");
    const validatedRecords = validatedCountRes.rows[0].count;
    console.log(`Validated churches: ${validatedRecords}`);

    const coordCountRes = await client.query("SELECT COUNT(*) FROM public.igrejas WHERE latitude IS NOT NULL AND longitude IS NOT NULL;");
    const coordRecords = coordCountRes.rows[0].count;
    console.log(`Churches with coordinates (non-null lat/lng): ${coordRecords}`);

    // Fetch a sample record to confirm coordinate types and data integrity
    const sampleRes = await client.query("SELECT codigo_totvs, desc_igreja, latitude, longitude, status FROM public.igrejas WHERE status = 'VALIDADO' LIMIT 3;");
    console.log('\nSample Validated Records:');
    console.log(JSON.stringify(sampleRes.rows, null, 2));

  } catch (err) {
    console.error('An error occurred during import:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();
