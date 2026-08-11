import { Pool } from 'pg';

export interface Igreja {
  id?: string;
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
  status: 'PENDENTE' | 'VALIDADO' | 'DUVIDA' | 'PENDENTE_REVISAO' | 'DESATIVADO' | 'REVISAO_ENDERECO';
  usuario_validador?: string | null;
  codigo_totvs_pai?: string | null;
  porte?: string | null;
  updated_at?: string;
  created_at?: string;
  validado_por?: string | null;
  validado_em?: string | null;
  observacoes?: string | null;
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
let memoryDb: Igreja[] = [
  {
    codigo_totvs: "10001",
    desc_igreja: "Estadual Central de São Paulo - IPDA",
    tipo_imovel: "PRÓPRIO",
    endereco: "Avenida do Estado, 4567",
    bairro: "Liberdade",
    municipio: "São Paulo",
    estado: "SP",
    cep: "01515-000",
    link_google_maps: "https://maps.google.com/?q=-23.55052,-46.633308",
    latitude: -23.55052,
    longitude: -46.633308,
    status: "VALIDADO",
    usuario_validador: "admin@ipda.com.br",
    codigo_totvs_pai: null,
  },
  {
    codigo_totvs: "10002",
    desc_igreja: "Central Franco da Rocha",
    tipo_imovel: "ALUGADO",
    endereco: "Rua Basílio Fazzi, 120",
    bairro: "Centro",
    municipio: "Franco da Rocha",
    estado: "SP",
    cep: "07850-340",
    link_google_maps: "https://maps.google.com/?q=-23.3275,-46.7275",
    latitude: -23.3275,
    longitude: -46.7275,
    status: "VALIDADO",
    usuario_validador: "admin@ipda.com.br",
    codigo_totvs_pai: "10001",
  }
];

// Ensure Postgres table exists if pool is configured
let isTableInitialized = false;
async function ensurePostgresTable() {
  // If in production environment and DATABASE_URL is missing, crash/throw error cleanly rather than silently falling back
  if (!databaseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is missing in production environment. Database operations cannot proceed.');
  }

  if (!pool || isTableInitialized) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS igrejas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo_totvs VARCHAR(100) UNIQUE NOT NULL,
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
          status VARCHAR(50) DEFAULT 'PENDENTE',
          validado_por VARCHAR(100),
          validado_em TIMESTAMP,
          usuario_validador VARCHAR(100),
          observacoes TEXT,
          codigo_totvs_pai VARCHAR(100),
          porte VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Run alter table/checks just in case the table exists but lacks columns
      try {
        await client.query(`ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();`);
        await client.query(`ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS validado_por VARCHAR(100);`);
        await client.query(`ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS validado_em TIMESTAMP;`);
        await client.query(`ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS observacoes TEXT;`);
        await client.query(`ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      } catch (alterErr) {
        console.warn('Alter table columns check failed (might be expected):', alterErr);
      }

      // ---------------------------------------------------------------
      // Bug 3: Retroactive correction — fix churches wrongly set as LOCAL
      // whose name prefix reveals their true porte.
      // ---------------------------------------------------------------
      try {
        await client.query(`UPDATE igrejas SET porte = 'ESTADUAL' WHERE (desc_igreja LIKE 'ESTADUAL%') AND (porte = 'LOCAL' OR porte IS NULL);`);
        await client.query(`UPDATE igrejas SET porte = 'SETORIAL' WHERE (desc_igreja LIKE 'SETORIAL%') AND (porte = 'LOCAL' OR porte IS NULL);`);
        await client.query(`UPDATE igrejas SET porte = 'CENTRAL' WHERE (desc_igreja LIKE 'CENTRAL%') AND (porte = 'LOCAL' OR porte IS NULL);`);
        await client.query(`UPDATE igrejas SET porte = 'REGIONAL' WHERE (desc_igreja LIKE 'REGIONAL%') AND (porte = 'LOCAL' OR porte IS NULL);`);
        await client.query(`UPDATE igrejas SET porte = 'ALDEIA INDIGENA' WHERE (desc_igreja LIKE 'ALDEIA%') AND (porte = 'LOCAL' OR porte IS NULL);`);
        await client.query(`UPDATE igrejas SET porte = 'CASA DE ORAÇÃO' WHERE (desc_igreja LIKE 'CASA DE ORA%') AND (porte = 'LOCAL' OR porte IS NULL);`);
      } catch (retroErr) {
        console.warn('Retroactive porte correction failed (non-fatal):', retroErr);
      }

      // ---------------------------------------------------------------
      // Validator Name Fusion Migration ('Luiz' -> 'Luiz Eduardo')
      // ---------------------------------------------------------------
      try {
        await client.query(`UPDATE igrejas SET validado_por = 'Luiz Eduardo' WHERE validado_por = 'Luiz';`);
        await client.query(`UPDATE igrejas SET usuario_validador = 'Luiz Eduardo' WHERE usuario_validador = 'Luiz';`);
      } catch (fuseErr) {
        console.warn('Validator name fusion failed (non-fatal):', fuseErr);
      }

      // ---------------------------------------------------------------
      // Validator Name Fusion Migration ('Guilherme' -> 'Guilherme de Almeida')
      // ---------------------------------------------------------------
      try {
        await client.query(`UPDATE igrejas SET validado_por = 'Guilherme de Almeida' WHERE validado_por = 'Guilherme';`);
        await client.query(`UPDATE igrejas SET usuario_validador = 'Guilherme de Almeida' WHERE usuario_validador = 'Guilherme';`);
      } catch (fuseErr) {
        console.warn('Validator name fusion for Guilherme failed (non-fatal):', fuseErr);
      }

      isTableInitialized = true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to initialize Postgres table:', err);
    pool = null; // force memory fallback
  }
}

export async function getIgrejas(
  filters?: { estado?: string; status?: string },
  columns?: string[]
): Promise<Igreja[]> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const selector = columns && columns.length > 0 ? columns.join(', ') : '*';
      let query = `SELECT ${selector} FROM igrejas WHERE 1=1`;
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

      // Order by desc_igreja ONLY if it's selected/requested
      if (!columns || columns.includes('desc_igreja')) {
        query += ' ORDER BY desc_igreja ASC';
      }

      const res = await pool.query(query, params);
      return res.rows.map((row) => {
        const item: any = {};
        if (row.id !== undefined) item.id = row.id;
        if (row.codigo_totvs !== undefined) item.codigo_totvs = row.codigo_totvs;
        if (row.desc_igreja !== undefined) item.desc_igreja = row.desc_igreja;
        if (row.tipo_imovel !== undefined) item.tipo_imovel = row.tipo_imovel;
        if (row.endereco !== undefined) item.endereco = row.endereco;
        if (row.bairro !== undefined) item.bairro = row.bairro;
        if (row.municipio !== undefined) item.municipio = row.municipio;
        if (row.estado !== undefined) item.estado = row.estado;
        if (row.cep !== undefined) item.cep = row.cep;
        if (row.link_google_maps !== undefined) item.link_google_maps = row.link_google_maps;
        if (row.latitude !== undefined) item.latitude = row.latitude === 0 ? null : row.latitude;
        if (row.longitude !== undefined) item.longitude = row.longitude === 0 ? null : row.longitude;
        if (row.status !== undefined) item.status = row.status as 'PENDENTE' | 'VALIDADO' | 'DUVIDA' | 'PENDENTE_REVISAO' | 'DESATIVADO' | 'REVISAO_ENDERECO';
        if (row.usuario_validador !== undefined) item.usuario_validador = row.usuario_validador;
        if (row.codigo_totvs_pai !== undefined) item.codigo_totvs_pai = row.codigo_totvs_pai;
        if (row.porte !== undefined) item.porte = row.porte;
        if (row.updated_at !== undefined) item.updated_at = row.updated_at;
        if (row.created_at !== undefined) item.created_at = row.created_at;
        if (row.validado_por !== undefined) item.validado_por = row.validado_por;
        if (row.validado_em !== undefined) item.validado_em = row.validado_em;
        if (row.observacoes !== undefined) item.observacoes = row.observacoes;
        return item as Igreja;
      });
    } catch (err) {
      console.error('Postgres error in getIgrejas:', err);
    }
  }

  // Fallback to In-Memory DB
  let data = [...memoryDb].map(item => {
    let validado_por = item.validado_por;
    let usuario_validador = item.usuario_validador;

    if (validado_por === 'Luiz') validado_por = 'Luiz Eduardo';
    if (validado_por === 'Guilherme') validado_por = 'Guilherme de Almeida';

    if (usuario_validador === 'Luiz') usuario_validador = 'Luiz Eduardo';
    if (usuario_validador === 'Guilherme') usuario_validador = 'Guilherme de Almeida';

    return {
      ...item,
      validado_por,
      usuario_validador,
    };
  });
  if (filters?.estado && filters.estado !== 'ALL') {
    data = data.filter((item) => item.estado === filters.estado);
  }
  if (filters?.status && filters.status !== 'ALL') {
    data = data.filter((item) => item.status === filters.status);
  }

  if (columns && columns.length > 0) {
    const colSet = new Set(columns);
    data = data.map((item: any) => {
      const filtered: any = {};
      colSet.forEach((col) => {
        if (item[col] !== undefined) {
          filtered[col] = item[col];
        }
      });
      return filtered;
    });
  }

  return data.sort((a, b) => (a.desc_igreja || '').localeCompare(b.desc_igreja || ''));
}

export interface IgrejaMap {
  id?: string;
  codigo_totvs: string;
  desc_igreja: string;
  latitude: number | null;
  longitude: number | null;
  status: Igreja['status'];
  porte?: string | null;
}

export async function getIgrejasForMap(): Promise<IgrejaMap[]> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const query = "SELECT id, codigo_totvs, desc_igreja, latitude, longitude, status, porte FROM igrejas WHERE status = 'VALIDADO' AND latitude IS NOT NULL AND longitude IS NOT NULL AND latitude <> 0 AND longitude <> 0 ORDER BY desc_igreja ASC";
      const res = await pool.query(query);
      return res.rows.map((row) => ({
        id: row.id,
        codigo_totvs: row.codigo_totvs,
        desc_igreja: row.desc_igreja,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status as Igreja['status'],
        porte: row.porte,
      }));
    } catch (err) {
      console.error('Postgres error in getIgrejasForMap:', err);
    }
  }

  // Fallback to In-Memory DB
  return memoryDb
    .filter((item) => item.status === 'VALIDADO' && item.latitude !== null && item.longitude !== null && item.latitude !== 0 && item.longitude !== 0)
    .map((item) => ({
      id: item.id,
      codigo_totvs: item.codigo_totvs,
      desc_igreja: item.desc_igreja,
      latitude: item.latitude,
      longitude: item.longitude,
      status: item.status,
      porte: item.porte,
    }))
    .sort((a, b) => a.desc_igreja.localeCompare(b.desc_igreja));
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

export interface BulkImportReport {
  novas: number;
  atualizadas: number;
  preservadas: number;
}

export async function saveIgrejasBulk(igrejas: Igreja[], options?: { isReclassificacao?: boolean }): Promise<BulkImportReport> {
  await ensurePostgresTable();
  const report: BulkImportReport = { novas: 0, atualizadas: 0, preservadas: 0 };

  if (pool) {
    const client = await pool.connect();
    try {
      // Retrieve existing rows to determine action type and protect work
      const keys = igrejas.map((ig) => ig.codigo_totvs);
      const existingRes = await client.query(
        'SELECT codigo_totvs, status, codigo_totvs_pai FROM igrejas WHERE codigo_totvs = ANY($1)',
        [keys]
      );
      const existingMap = new Map(
        existingRes.rows.map((row) => [
          row.codigo_totvs,
          { status: row.status, codigo_totvs_pai: row.codigo_totvs_pai },
        ])
      );

      // Chunk size to split database operations and prevent parameterized limits
      const CHUNK_SIZE = 500;

      for (let i = 0; i < igrejas.length; i += CHUNK_SIZE) {
        const chunk = igrejas.slice(i, i + CHUNK_SIZE);

        await client.query('BEGIN');
        for (const ig of chunk) {
          const existing = existingMap.get(ig.codigo_totvs);

          if (!existing) {
            report.novas++;
          } else {
            const isStatusValidado = existing.status === 'VALIDADO';
            const isParentSet = existing.codigo_totvs_pai !== null && existing.codigo_totvs_pai !== undefined && existing.codigo_totvs_pai !== '';

            if (options?.isReclassificacao) {
              if (isStatusValidado) {
                report.preservadas++;
              } else {
                report.atualizadas++;
              }
            } else {
              if (isStatusValidado || isParentSet) {
                report.preservadas++;
              } else {
                report.atualizadas++;
              }
            }
          }

          const queryText = options?.isReclassificacao
            ? `INSERT INTO igrejas (
              codigo_totvs, desc_igreja, tipo_imovel, endereco, bairro, municipio, estado, cep, link_google_maps, latitude, longitude, status, codigo_totvs_pai, porte
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (codigo_totvs) DO UPDATE SET
              desc_igreja = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.desc_igreja
                ELSE EXCLUDED.desc_igreja
              END,
              tipo_imovel = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.tipo_imovel
                ELSE EXCLUDED.tipo_imovel
              END,
              endereco = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.endereco
                ELSE EXCLUDED.endereco
              END,
              bairro = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.bairro
                ELSE EXCLUDED.bairro
              END,
              municipio = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.municipio
                ELSE EXCLUDED.municipio
              END,
              estado = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.estado
                ELSE EXCLUDED.estado
              END,
              cep = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.cep
                ELSE EXCLUDED.cep
              END,
              porte = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.porte
                ELSE CASE
                  WHEN EXCLUDED.porte IS NOT NULL AND EXCLUDED.porte <> '' THEN EXCLUDED.porte
                  ELSE COALESCE(igrejas.porte, EXCLUDED.porte)
                END
              END,
              status = CASE
                WHEN igrejas.status = 'VALIDADO' THEN
                  CASE
                    WHEN TRIM(UPPER(COALESCE(igrejas.endereco, ''))) <> TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN 'REVISAO_ENDERECO'
                    ELSE 'VALIDADO'
                  END
                ELSE EXCLUDED.status
              END,
              latitude = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.latitude
                ELSE COALESCE(EXCLUDED.latitude, igrejas.latitude)
              END,
              longitude = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.longitude
                ELSE COALESCE(EXCLUDED.longitude, igrejas.longitude)
              END,
              usuario_validador = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.usuario_validador
                ELSE EXCLUDED.usuario_validador
              END,
              link_google_maps = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.link_google_maps
                ELSE COALESCE(NULLIF(EXCLUDED.link_google_maps, ''), igrejas.link_google_maps)
              END,
              codigo_totvs_pai = CASE
                WHEN igrejas.codigo_totvs_pai IS NOT NULL AND igrejas.codigo_totvs_pai <> '' THEN igrejas.codigo_totvs_pai
                ELSE EXCLUDED.codigo_totvs_pai
              END,
              updated_at = CURRENT_TIMESTAMP`
            : `INSERT INTO igrejas (
              codigo_totvs, desc_igreja, tipo_imovel, endereco, bairro, municipio, estado, cep, link_google_maps, latitude, longitude, status, codigo_totvs_pai, porte
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (codigo_totvs) DO UPDATE SET
              desc_igreja = igrejas.desc_igreja,
              tipo_imovel = igrejas.tipo_imovel,
              endereco = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.endereco
                ELSE EXCLUDED.endereco
              END,
              bairro = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.bairro
                ELSE EXCLUDED.bairro
              END,
              municipio = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.municipio
                ELSE EXCLUDED.municipio
              END,
              estado = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.estado
                ELSE EXCLUDED.estado
              END,
              cep = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.cep
                ELSE EXCLUDED.cep
              END,
              porte = CASE
                WHEN igrejas.status = 'VALIDADO' THEN igrejas.porte
                ELSE CASE
                  WHEN EXCLUDED.porte IS NOT NULL AND EXCLUDED.porte <> '' THEN EXCLUDED.porte
                  ELSE COALESCE(igrejas.porte, EXCLUDED.porte)
                END
              END,
              status = CASE
                WHEN TRIM(UPPER(COALESCE(igrejas.endereco, ''))) <> TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN 'PENDENTE_REVISAO'
                ELSE igrejas.status
              END,
              latitude = igrejas.latitude,
              longitude = igrejas.longitude,
              usuario_validador = igrejas.usuario_validador,
              link_google_maps = igrejas.link_google_maps,
              codigo_totvs_pai = CASE
                WHEN igrejas.codigo_totvs_pai IS NOT NULL AND igrejas.codigo_totvs_pai <> '' THEN igrejas.codigo_totvs_pai
                ELSE EXCLUDED.codigo_totvs_pai
              END,
              updated_at = CASE
                WHEN igrejas.status = 'VALIDADO' AND TRIM(UPPER(COALESCE(igrejas.endereco, ''))) = TRIM(UPPER(COALESCE(EXCLUDED.endereco, ''))) THEN igrejas.updated_at
                ELSE CURRENT_TIMESTAMP
              END`;

          await client.query(queryText, [
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
            ig.codigo_totvs_pai || null,
            ig.porte || null,
          ]);
        }
        await client.query('COMMIT');
      }
      return report;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Failed to rollback transaction:', rollbackErr);
      }
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
      const isStatusValidado = existing.status === 'VALIDADO';
      const isParentSet = existing.codigo_totvs_pai !== null && existing.codigo_totvs_pai !== undefined && existing.codigo_totvs_pai !== '';

      if (options?.isReclassificacao) {
        if (isStatusValidado) {
          report.preservadas++;
        } else {
          report.atualizadas++;
        }
      } else {
        if (isStatusValidado || isParentSet) {
          report.preservadas++;
        } else {
          report.atualizadas++;
        }
      }

      const existingAddr = (existing.endereco || '').trim().toUpperCase();
      const incomingAddr = (ig.endereco || '').trim().toUpperCase();
      const enderecoMudou = existingAddr !== incomingAddr;

      if (options?.isReclassificacao) {
        if (isStatusValidado) {
          if (enderecoMudou) {
            const novoPorte = (ig.porte !== null && ig.porte !== undefined && ig.porte !== '')
              ? ig.porte
              : (existing.porte || ig.porte);

            map.set(ig.codigo_totvs, {
              ...existing,
              endereco: ig.endereco,
              bairro: ig.bairro,
              municipio: ig.municipio,
              estado: ig.estado,
              cep: ig.cep,
              porte: novoPorte,
              desc_igreja: ig.desc_igreja || existing.desc_igreja,
              tipo_imovel: ig.tipo_imovel || existing.tipo_imovel,
              status: 'REVISAO_ENDERECO',
              codigo_totvs_pai: isParentSet
                ? existing.codigo_totvs_pai
                : ig.codigo_totvs_pai || existing.codigo_totvs_pai,
              updated_at: new Date().toISOString(),
            });
          } else {
            map.set(ig.codigo_totvs, {
              ...existing,
              codigo_totvs_pai: isParentSet
                ? existing.codigo_totvs_pai
                : ig.codigo_totvs_pai || existing.codigo_totvs_pai,
            });
          }
        } else {
          const novoPorte = (ig.porte !== null && ig.porte !== undefined && ig.porte !== '')
            ? ig.porte
            : (existing.porte || ig.porte);

          map.set(ig.codigo_totvs, {
            ...existing,
            ...ig,
            porte: novoPorte,
            codigo_totvs_pai: isParentSet
              ? existing.codigo_totvs_pai
              : ig.codigo_totvs_pai || existing.codigo_totvs_pai,
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        const novoStatus = enderecoMudou ? 'PENDENTE_REVISAO' : existing.status;

        if (isStatusValidado) {
          map.set(ig.codigo_totvs, {
            ...existing,
            status: novoStatus,
            updated_at: existing.status !== novoStatus ? new Date().toISOString() : existing.updated_at,
          });
        } else {
          const novoPorte = (ig.porte !== null && ig.porte !== undefined && ig.porte !== '')
            ? ig.porte
            : (existing.porte || ig.porte);

          map.set(ig.codigo_totvs, {
            ...existing,
            endereco: ig.endereco,
            bairro: ig.bairro,
            municipio: ig.municipio,
            estado: ig.estado,
            cep: ig.cep,
            porte: novoPorte,
            status: novoStatus,
            codigo_totvs_pai: isParentSet
              ? existing.codigo_totvs_pai
              : ig.codigo_totvs_pai || existing.codigo_totvs_pai,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else {
      report.novas++;
      map.set(ig.codigo_totvs, {
        ...ig,
        status: 'PENDENTE',
        updated_at: new Date().toISOString(),
      });
    }
  });

  memoryDb = Array.from(map.values());
  return report;
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
