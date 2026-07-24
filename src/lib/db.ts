import { Pool } from 'pg';

export interface Igreja {
  codigo_totvs: string;
  desc_igreja: string;
  tipo_imovel: string;
  endereco: string;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  link_google_maps: string;
  latitude: number | null;
  longitude: number | null;
  status: 'PENDENTE' | 'VALIDADO' | 'DUVIDA' | 'PENDENTE_REVISAO';
  usuario_validador?: string | null;
  updated_at?: string;
}

// Check database URL in env
const databaseUrl = process.env.DATABASE_URL;
let pool: Pool | null = null;

if (databaseUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  } catch (error) {
    console.error('Failed to initialize Postgres Pool:', error);
  }
}

// Safe In-Memory fallback for environments without DATABASE_URL (no file writing, 100% Vercel friendly)
let memoryDb: Igreja[] = [];

// Ensure Postgres table exists if pool is configured
let isTableInitialized = false;
async function ensurePostgresTable() {
  if (!pool || isTableInitialized) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS igrejas (
          codigo_totvs VARCHAR(100) PRIMARY KEY,
          desc_igreja VARCHAR(255) NOT NULL,
          tipo_imovel VARCHAR(100),
          endereco TEXT,
          bairro VARCHAR(100),
          municipio VARCHAR(100),
          estado VARCHAR(50),
          cep VARCHAR(20),
          link_google_maps TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          status VARCHAR(20) DEFAULT 'PENDENTE',
          usuario_validador VARCHAR(100),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      isTableInitialized = true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to initialize Postgres table:', err);
    pool = null; // force memory fallback
  }
}

export async function getIgrejas(filters?: { estado?: string; status?: string }): Promise<Igreja[]> {
  await ensurePostgresTable();
  if (pool) {
    try {
      let query = 'SELECT * FROM igrejas WHERE 1=1';
      const params: string[] = [];
      let paramCount = 1;

      if (filters?.estado && filters.estado !== 'ALL') {
        query += ` AND estado = $${paramCount}`;
        params.push(filters.estado);
        paramCount++;
      }

      if (filters?.status && filters.status !== 'ALL') {
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      query += ' ORDER BY desc_igreja ASC';
      const res = await pool.query(query, params);
      return res.rows.map((row) => ({
        codigo_totvs: row.codigo_totvs,
        desc_igreja: row.desc_igreja,
        tipo_imovel: row.tipo_imovel,
        endereco: row.endereco,
        bairro: row.bairro,
        municipio: row.municipio,
        estado: row.estado,
        cep: row.cep,
        link_google_maps: row.link_google_maps,
        latitude: row.latitude === 0 ? null : row.latitude,
        longitude: row.longitude === 0 ? null : row.longitude,
        status: row.status as 'PENDENTE' | 'VALIDADO' | 'DUVIDA' | 'PENDENTE_REVISAO',
        usuario_validador: row.usuario_validador,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('Postgres error in getIgrejas:', err);
    }
  }

  // Fallback to In-Memory DB
  let data = [...memoryDb];
  if (filters?.estado && filters.estado !== 'ALL') {
    data = data.filter((item) => item.estado === filters.estado);
  }
  if (filters?.status && filters.status !== 'ALL') {
    data = data.filter((item) => item.status === filters.status);
  }
  return data.sort((a, b) => a.desc_igreja.localeCompare(b.desc_igreja));
}

export async function getDistinctStates(): Promise<string[]> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const res = await pool.query('SELECT DISTINCT estado FROM igrejas WHERE estado IS NOT NULL AND estado <> \'\' ORDER BY estado ASC');
      return res.rows.map((row) => row.estado);
    } catch (err) {
      console.error('Postgres error in getDistinctStates:', err);
    }
  }

  const states = Array.from(new Set(memoryDb.map((item) => item.estado).filter(Boolean)));
  return states.sort();
}

export async function saveIgrejasBulk(igrejas: Igreja[]): Promise<void> {
  await ensurePostgresTable();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const ig of igrejas) {
        await client.query(
          `INSERT INTO igrejas (
            codigo_totvs, desc_igreja, tipo_imovel, endereco, bairro, municipio, estado, cep, link_google_maps, latitude, longitude, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (codigo_totvs) DO UPDATE SET
            desc_igreja = EXCLUDED.desc_igreja,
            tipo_imovel = EXCLUDED.tipo_imovel,
            bairro = EXCLUDED.bairro,
            municipio = EXCLUDED.municipio,
            estado = EXCLUDED.estado,
            cep = EXCLUDED.cep,
            status = CASE
              WHEN igrejas.endereco <> EXCLUDED.endereco THEN 'PENDENTE_REVISAO'
              ELSE igrejas.status
            END,
            latitude = CASE
              WHEN igrejas.endereco = EXCLUDED.endereco AND igrejas.status = 'VALIDADO' THEN igrejas.latitude
              ELSE COALESCE(EXCLUDED.latitude, igrejas.latitude)
            END,
            longitude = CASE
              WHEN igrejas.endereco = EXCLUDED.endereco AND igrejas.status = 'VALIDADO' THEN igrejas.longitude
              ELSE COALESCE(EXCLUDED.longitude, igrejas.longitude)
            END,
            link_google_maps = CASE
              WHEN igrejas.endereco = EXCLUDED.endereco AND igrejas.status = 'VALIDADO' THEN igrejas.link_google_maps
              ELSE COALESCE(NULLIF(EXCLUDED.link_google_maps, ''), igrejas.link_google_maps)
            END,
            endereco = EXCLUDED.endereco,
            updated_at = CURRENT_TIMESTAMP`,
          [
            ig.codigo_totvs,
            ig.desc_igreja,
            ig.tipo_imovel,
            ig.endereco,
            ig.bairro,
            ig.municipio,
            ig.estado,
            ig.cep,
            ig.link_google_maps,
            ig.latitude,
            ig.longitude,
            ig.status || 'PENDENTE',
          ]
        );
      }
      await client.query('COMMIT');
      return;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Postgres error during bulk insert:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback to In-Memory DB
  const map = new Map<string, Igreja>();
  memoryDb.forEach((item) => map.set(item.codigo_totvs, item));

  igrejas.forEach((ig) => {
    const existing = map.get(ig.codigo_totvs);
    if (existing) {
      const enderecoMudou = existing.endereco !== ig.endereco;
      const novoStatus = enderecoMudou
        ? 'PENDENTE_REVISAO'
        : existing.status;

      const manterIntacto = !enderecoMudou && existing.status === 'VALIDADO';

      map.set(ig.codigo_totvs, {
        ...existing,
        desc_igreja: ig.desc_igreja,
        tipo_imovel: ig.tipo_imovel,
        endereco: ig.endereco,
        bairro: ig.bairro,
        municipio: ig.municipio,
        estado: ig.estado,
        cep: ig.cep,
        link_google_maps: manterIntacto
          ? existing.link_google_maps
          : (ig.link_google_maps || existing.link_google_maps),
        latitude: manterIntacto
          ? existing.latitude
          : (ig.latitude !== null ? ig.latitude : existing.latitude),
        longitude: manterIntacto
          ? existing.longitude
          : (ig.longitude !== null ? ig.longitude : existing.longitude),
        status: novoStatus,
        updated_at: new Date().toISOString(),
      });
    } else {
      map.set(ig.codigo_totvs, {
        ...ig,
        status: 'PENDENTE',
        updated_at: new Date().toISOString(),
      });
    }
  });

  memoryDb = Array.from(map.values());
}

export async function saveIgrejaSingle(codigo_totvs: string, update: Partial<Igreja>): Promise<void> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const keys = Object.keys(update) as Array<keyof Igreja>;
      if (keys.length > 0) {
        const sets: string[] = [];
        const params: unknown[] = [codigo_totvs];
        let idx = 2;
        keys.forEach((key) => {
          sets.push(`${String(key)} = $${idx}`);
          params.push(update[key]);
          idx++;
        });

        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        await pool.query(
          `UPDATE igrejas SET ${sets.join(', ')} WHERE codigo_totvs = $1`,
          params
        );
        return;
      }
    } catch (err) {
      console.error('Postgres error in saveIgrejaSingle:', err);
      throw err;
    }
  }

  // Fallback to In-Memory DB
  const idx = memoryDb.findIndex((item) => item.codigo_totvs === codigo_totvs);
  if (idx !== -1) {
    memoryDb[idx] = {
      ...memoryDb[idx],
      ...update,
      updated_at: new Date().toISOString(),
    };
  } else {
    throw new Error(`Church with codigo_totvs ${codigo_totvs} not found.`);
  }
}
