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
  data_validacao?: string | null;
  observacoes?: string | null;
  observacao?: string | null;
  observacao_duvida?: string | null;
  duvida?: string | null;
  dirigente_nome?: string | null;
  dirigente_telefone?: string | null;
  dirigente_email?: string | null;
  financeira_nome?: string | null;
  financeira_telefone?: string | null;
  financeira_email?: string | null;
  dirigente_data_posse?: string | null;
  qtd_membros?: number | null;
  qtd_jovens?: number | null;
  tipo_prebenda?: string | null;
}

// Global singleton pattern for pg Pool in serverless environments
const globalForDb = globalThis as unknown as {
  pgPool: Pool | undefined;
};

const databaseUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, '')
  : undefined;

function createPool(): Pool | null {
  if (!databaseUrl) return null;
  try {
    return new Pool({
      connectionString: databaseUrl,
      max: 10, // Limit connection pool size per lambda instance
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  } catch (error) {
    console.error('Failed to initialize Postgres Pool:', error);
    return null;
  }
}

const pool: Pool | null = globalForDb.pgPool ?? createPool();
if (pool) {
  globalForDb.pgPool = pool;
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

// Ensure database check in production
async function ensurePostgresTable() {
  if (!databaseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is missing in production environment. Database operations cannot proceed.');
  }
}

// Columns accepted by the data-access layer. Keeping this list here prevents a
// request payload from ever becoming part of the SQL syntax.
const IGREJA_COLUMNS = new Set<keyof Igreja>([
  'id', 'codigo_totvs', 'desc_igreja', 'tipo_imovel', 'endereco', 'bairro',
  'municipio', 'estado', 'cep', 'link_google_maps', 'latitude', 'longitude',
  'status', 'usuario_validador', 'codigo_totvs_pai', 'porte', 'updated_at',
  'created_at', 'validado_por', 'validado_em', 'data_validacao', 'observacoes',
  'observacao', 'observacao_duvida', 'duvida', 'dirigente_nome',
  'dirigente_telefone', 'dirigente_email', 'financeira_nome',
  'financeira_telefone', 'financeira_email', 'dirigente_data_posse',
  'qtd_membros', 'qtd_jovens', 'tipo_prebenda',
]);

const UPDATABLE_IGREJA_COLUMNS = new Set<keyof Igreja>([
  'desc_igreja', 'tipo_imovel', 'endereco', 'bairro', 'municipio', 'estado',
  'cep', 'link_google_maps', 'latitude', 'longitude', 'status',
  'usuario_validador', 'codigo_totvs_pai', 'porte', 'validado_por',
  'validado_em', 'data_validacao', 'observacoes', 'observacao',
  'observacao_duvida', 'duvida', 'dirigente_nome', 'dirigente_telefone',
  'dirigente_email', 'financeira_nome', 'financeira_telefone',
  'financeira_email', 'dirigente_data_posse', 'qtd_membros', 'qtd_jovens',
  'tipo_prebenda',
]);

function getSafeColumns(columns?: string[]): Array<keyof Igreja> | undefined {
  if (!columns || columns.length === 0) return undefined;
  const invalidColumn = columns.find((column) => !IGREJA_COLUMNS.has(column as keyof Igreja));
  if (invalidColumn) throw new Error(`Coluna inválida solicitada: ${invalidColumn}`);
  return columns as Array<keyof Igreja>;
}

function isValidatedStatus(status: string | null | undefined): boolean {
  return (status || '').trim().toUpperCase().startsWith('VALIDAD');
}

export async function getIgrejas(
  filters?: {
    estado?: string;
    status?: string;
    porte?: string;
    page?: number;
    limit?: number;
    search?: string;
  },
  columns?: string[]
): Promise<{ data: Igreja[]; total: number }> {
  await ensurePostgresTable();
  const safeColumns = getSafeColumns(columns);

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const limit = filters?.limit && filters.limit > 0 ? filters.limit : undefined;
  const search = filters?.search?.trim() || '';

  if (pool) {
    try {
      let whereClause = ' WHERE 1=1';
      const params: (string | number)[] = [];
      let paramCount = 1;

      if (filters?.estado && filters.estado !== 'ALL') {
        whereClause += ` AND estado = $${paramCount}`;
        params.push(filters.estado);
        paramCount++;
      }

      if (filters?.status && filters.status !== 'ALL') {
        if (filters.status === 'VALIDADO') {
          whereClause += ` AND (LOWER(status) LIKE 'validad%' OR UPPER(status) IN ('VALIDADO', 'VALIDADA'))`;
        } else {
          whereClause += ` AND status = $${paramCount}`;
          params.push(filters.status);
          paramCount++;
        }
      }

      if (filters?.porte && filters.porte !== 'ALL') {
        const p = filters.porte.toUpperCase();
        if (p === 'LOCAL') {
          whereClause += ` AND (porte = 'LOCAL' OR (porte IS NULL AND UPPER(desc_igreja) NOT LIKE '%ESTADUAL%' AND UPPER(desc_igreja) NOT LIKE '%SETORIAL%' AND UPPER(desc_igreja) NOT LIKE '%CENTRAL%' AND UPPER(desc_igreja) NOT LIKE '%REGIONAL%' AND UPPER(desc_igreja) NOT LIKE '%ORAÇÃO%' AND UPPER(desc_igreja) NOT LIKE '%ORACAO%' AND UPPER(desc_igreja) NOT LIKE '%ALDEIA%' AND UPPER(desc_igreja) NOT LIKE '%INDIGENA%'))`;
        } else if (p === 'CASA DE ORAÇÃO' || p === 'CASA DE ORACAO') {
          whereClause += ` AND (porte = 'CASA DE ORAÇÃO' OR porte = 'CASA DE ORACAO' OR (porte IS NULL AND (UPPER(desc_igreja) LIKE '%CASA DE ORAÇÃO%' OR UPPER(desc_igreja) LIKE '%CASA DE ORACAO%' OR UPPER(desc_igreja) LIKE '%ORAÇÃO%' OR UPPER(desc_igreja) LIKE '%ORACAO%')))`;
        } else if (p === 'ALDEIA INDIGENA' || p === 'ALDEIA INDÍGENA') {
          whereClause += ` AND (porte = 'ALDEIA INDIGENA' OR porte = 'ALDEIA INDÍGENA' OR (porte IS NULL AND (UPPER(desc_igreja) LIKE '%ALDEIA%' OR UPPER(desc_igreja) LIKE '%INDIGENA%' OR UPPER(desc_igreja) LIKE '%INDÍGENA%')))`;
        } else {
          // ESTADUAL, SETORIAL, CENTRAL, REGIONAL
          whereClause += ` AND (porte = $${paramCount} OR (porte IS NULL AND UPPER(desc_igreja) LIKE $${paramCount + 1}))`;
          params.push(p, `%${p}%`);
          paramCount += 2;
        }
      }

      if (search) {
        whereClause += ` AND (desc_igreja ILIKE $${paramCount} OR codigo_totvs ILIKE $${paramCount} OR municipio ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      // Count query for total matching records
      const countQuery = `SELECT COUNT(*) AS total FROM igrejas${whereClause}`;
      const countRes = await pool.query(countQuery, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const selector = safeColumns ? safeColumns.join(', ') : '*';
      let dataQuery = `SELECT ${selector} FROM igrejas${whereClause}`;

      // Order by desc_igreja ONLY if it's selected/requested
      if (!safeColumns || safeColumns.includes('desc_igreja')) {
        dataQuery += ' ORDER BY desc_igreja ASC';
      }

      const queryParams = [...params];
      if (limit !== undefined) {
        const offset = (page - 1) * limit;
        dataQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        queryParams.push(limit, offset);
      }

      const res = await pool.query(dataQuery, queryParams);
      const data = res.rows.map((row) => {
        const item: Partial<Igreja> = {};
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
        if (row.data_validacao !== undefined) item.data_validacao = row.data_validacao;
        if (row.observacoes !== undefined) item.observacoes = row.observacoes;
        if (row.observacao !== undefined) item.observacao = row.observacao;
        if (row.observacao_duvida !== undefined) item.observacao_duvida = row.observacao_duvida;
        if (row.duvida !== undefined) item.duvida = row.duvida;
        if (row.dirigente_nome !== undefined) item.dirigente_nome = row.dirigente_nome;
        if (row.dirigente_telefone !== undefined) item.dirigente_telefone = row.dirigente_telefone;
        if (row.dirigente_email !== undefined) item.dirigente_email = row.dirigente_email;
        if (row.financeira_nome !== undefined) item.financeira_nome = row.financeira_nome;
        if (row.financeira_telefone !== undefined) item.financeira_telefone = row.financeira_telefone;
        if (row.financeira_email !== undefined) item.financeira_email = row.financeira_email;
        if (row.dirigente_data_posse !== undefined) {
          item.dirigente_data_posse = row.dirigente_data_posse
            ? (typeof row.dirigente_data_posse === 'string'
                ? row.dirigente_data_posse.split('T')[0]
                : new Date(row.dirigente_data_posse).toISOString().split('T')[0])
            : null;
        }
        if (row.qtd_membros !== undefined) item.qtd_membros = row.qtd_membros;
        if (row.qtd_jovens !== undefined) item.qtd_jovens = row.qtd_jovens;
        if (row.tipo_prebenda !== undefined) item.tipo_prebenda = row.tipo_prebenda;
        return item as Igreja;
      });

      return { data, total };
    } catch (err) {
      console.error('Postgres error in getIgrejas:', err);
      throw err;
    }
  }

  // Fallback to In-Memory DB
  let data: Igreja[] = [...memoryDb].map(item => {
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
    if (filters.status === 'VALIDADO') {
      data = data.filter((item) => isValidatedStatus(item.status));
    } else {
      data = data.filter((item) => item.status === filters.status);
    }
  }
  if (filters?.porte && filters.porte !== 'ALL') {
    const p = filters.porte.toUpperCase();
    data = data.filter((item) => {
      const explicitPorte = (item.porte || '').toUpperCase();
      const desc = (item.desc_igreja || '').toUpperCase();
      if (p === 'LOCAL') {
        return (
          explicitPorte === 'LOCAL' ||
          (!item.porte &&
            !desc.includes('ESTADUAL') &&
            !desc.includes('SETORIAL') &&
            !desc.includes('CENTRAL') &&
            !desc.includes('REGIONAL') &&
            !desc.includes('ORAÇÃO') &&
            !desc.includes('ORACAO') &&
            !desc.includes('ALDEIA') &&
            !desc.includes('INDIGENA') &&
            !desc.includes('INDÍGENA'))
        );
      } else if (p === 'CASA DE ORAÇÃO' || p === 'CASA DE ORACAO') {
        return (
          explicitPorte === 'CASA DE ORAÇÃO' ||
          explicitPorte === 'CASA DE ORACAO' ||
          (!item.porte && (desc.includes('CASA DE ORAÇÃO') || desc.includes('CASA DE ORACAO') || desc.includes('ORAÇÃO') || desc.includes('ORACAO')))
        );
      } else if (p === 'ALDEIA INDIGENA' || p === 'ALDEIA INDÍGENA') {
        return (
          explicitPorte === 'ALDEIA INDIGENA' ||
          explicitPorte === 'ALDEIA INDÍGENA' ||
          (!item.porte && (desc.includes('ALDEIA') || desc.includes('INDIGENA') || desc.includes('INDÍGENA')))
        );
      } else {
        return explicitPorte === p || (!item.porte && desc.includes(p));
      }
    });
  }
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(
      (item) =>
        (item.desc_igreja || '').toLowerCase().includes(s) ||
        (item.codigo_totvs || '').toLowerCase().includes(s) ||
        (item.municipio || '').toLowerCase().includes(s)
    );
  }

  const total = data.length;

  data.sort((a, b) => (a.desc_igreja || '').localeCompare(b.desc_igreja || ''));

  if (limit !== undefined) {
    const offset = (page - 1) * limit;
    data = data.slice(offset, offset + limit);
  }

  if (safeColumns) {
    data = data.map((item) => {
      const filtered: Record<string, unknown> = {};
      safeColumns.forEach((column) => {
        const value = item[column];
        if (value !== undefined) filtered[column] = value;
      });
      return filtered as unknown as Igreja;
    });
  }

  return { data, total };
}

export interface IgrejaMap {
  id?: string;
  codigo_totvs: string;
  desc_igreja: string;
  latitude: number | null;
  longitude: number | null;
  status: Igreja['status'];
  porte?: string | null;
  codigo_totvs_pai?: string | null;
}

export async function getIgrejasForMap(): Promise<IgrejaMap[]> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const query = "SELECT id, codigo_totvs, desc_igreja, latitude, longitude, status, porte, codigo_totvs_pai FROM igrejas WHERE (LOWER(status) LIKE 'validad%' OR UPPER(status) IN ('VALIDADO', 'VALIDADA')) AND latitude IS NOT NULL AND longitude IS NOT NULL AND latitude <> 0 AND longitude <> 0 ORDER BY desc_igreja ASC";
      const res = await pool.query(query);
      return res.rows.map((row) => ({
        id: row.id,
        codigo_totvs: row.codigo_totvs,
        desc_igreja: row.desc_igreja,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status as Igreja['status'],
        porte: row.porte,
        codigo_totvs_pai: row.codigo_totvs_pai,
      }));
    } catch (err) {
      console.error('Postgres error in getIgrejasForMap:', err);
      throw err;
    }
  }

  // Fallback to In-Memory DB
  return memoryDb
    .filter((item) => isValidatedStatus(item.status) && item.latitude !== null && item.longitude !== null && item.latitude !== 0 && item.longitude !== 0)
    .map((item) => ({
      id: item.id,
      codigo_totvs: item.codigo_totvs,
      desc_igreja: item.desc_igreja,
      latitude: item.latitude,
      longitude: item.longitude,
      status: item.status,
      porte: item.porte,
      codigo_totvs_pai: item.codigo_totvs_pai,
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
      throw err;
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
            const isStatusValidado = isValidatedStatus(existing.status);
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
      const isStatusValidado = isValidatedStatus(existing.status);
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

export async function saveIgrejaSingle(
  identifier: string | { id?: string; codigo_totvs?: string },
  update: Partial<Igreja>
): Promise<Igreja> {
  await ensurePostgresTable();

  const id = typeof identifier === 'object' ? identifier.id : undefined;
  const codigo_totvs = typeof identifier === 'object' ? identifier.codigo_totvs : identifier;

  if (!id && !codigo_totvs) {
    throw new Error('ID ou codigo_totvs é obrigatório para salvar.');
  }

  const updateEntries = Object.entries(update).filter(([key]) =>
    UPDATABLE_IGREJA_COLUMNS.has(key as keyof Igreja)
  ) as Array<[keyof Igreja, Igreja[keyof Igreja]]>;

  if (updateEntries.length !== Object.keys(update).length) {
    throw new Error('A atualização contém campos não permitidos.');
  }

  if (pool) {
    try {
      const whereClause = id ? 'id = $1' : 'codigo_totvs = $1';
      const whereParam = id || codigo_totvs;

      const existingRes = await pool.query(
        `SELECT * FROM igrejas WHERE ${whereClause} LIMIT 1`,
        [whereParam]
      );

      if (existingRes.rows.length === 0) {
        // INSERT if record does not exist
        const insertData: Record<string, unknown> = {
          ...update,
          codigo_totvs: codigo_totvs || update.codigo_totvs || `TEMP_${Date.now()}`,
          desc_igreja: update.desc_igreja || `Igreja ${codigo_totvs || ''}`,
          updated_at: new Date(),
        };
        if (id) insertData.id = id;

        const keys = Object.keys(insertData);
        const cols = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => insertData[k]);

        const insertRes = await pool.query(
          `INSERT INTO igrejas (${cols}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        return insertRes.rows[0] as Igreja;
      } else {
        // UPDATE if record exists
        const keys = updateEntries.map(([key]) => key);
        if (keys.length > 0) {
          const sets: string[] = [];
          const params: unknown[] = [whereParam];
          let idx = 2;
          keys.forEach((key) => {
            sets.push(`${String(key)} = $${idx}`);
            params.push(update[key]);
            idx++;
          });
          sets.push(`updated_at = CURRENT_TIMESTAMP`);

          const updateRes = await pool.query(
            `UPDATE igrejas SET ${sets.join(', ')} WHERE ${whereClause} RETURNING *`,
            params
          );
          return updateRes.rows[0] as Igreja;
        }
        return existingRes.rows[0] as Igreja;
      }
    } catch (err) {
      console.error('Postgres error in saveIgrejaSingle:', err);
      throw err;
    }
  }

  // Fallback to In-Memory DB
  let idx = -1;
  if (id) {
    idx = memoryDb.findIndex((item) => item.id === id);
  }
  if (idx === -1 && codigo_totvs) {
    idx = memoryDb.findIndex((item) => item.codigo_totvs === codigo_totvs);
  }

  if (idx !== -1) {
    memoryDb[idx] = {
      ...memoryDb[idx],
      ...Object.fromEntries(updateEntries),
      updated_at: new Date().toISOString(),
    };
    return memoryDb[idx];
  } else {
    const newItem: Igreja = {
      id: id || undefined,
      codigo_totvs: codigo_totvs || (update.codigo_totvs as string) || `TEMP_${Date.now()}`,
      desc_igreja: update.desc_igreja || `Igreja ${codigo_totvs || ''}`,
      tipo_imovel: update.tipo_imovel || 'ALUGADO',
      endereco: update.endereco || '',
      bairro: update.bairro || '',
      municipio: update.municipio || '',
      estado: update.estado || '',
      cep: update.cep || '',
      link_google_maps: update.link_google_maps || '',
      latitude: update.latitude ?? null,
      longitude: update.longitude ?? null,
      status: update.status || 'PENDENTE',
      ...Object.fromEntries(updateEntries),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.push(newItem);
    return newItem;
  }
}

export async function reassignIgrejaChildren(
  codigoTotvsPai: string,
  novoCodigoTotvsPai: string
): Promise<number> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const result = await pool.query(
        `UPDATE igrejas
         SET codigo_totvs_pai = $2, updated_at = CURRENT_TIMESTAMP
         WHERE codigo_totvs_pai = $1`,
        [codigoTotvsPai, novoCodigoTotvsPai]
      );
      return result.rowCount ?? 0;
    } catch (err) {
      console.error('Postgres error in reassignIgrejaChildren:', err);
      throw err;
    }
  }

  let updated = 0;
  memoryDb = memoryDb.map((igreja) => {
    if (igreja.codigo_totvs_pai !== codigoTotvsPai) return igreja;
    updated++;
    return {
      ...igreja,
      codigo_totvs_pai: novoCodigoTotvsPai,
      updated_at: new Date().toISOString(),
    };
  });
  return updated;
}

export async function criarIgrejaSingle(igreja: Igreja): Promise<void> {
  await ensurePostgresTable();
  if (pool) {
    try {
      const query = `
        INSERT INTO igrejas (
          codigo_totvs, desc_igreja, tipo_imovel, endereco, bairro, municipio, estado, cep,
          link_google_maps, latitude, longitude, status, codigo_totvs_pai, porte,
          dirigente_nome, dirigente_telefone, dirigente_email, dirigente_data_posse,
          financeira_nome, financeira_telefone, financeira_email, qtd_membros, qtd_jovens, tipo_prebenda
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      `;
      await pool.query(query, [
        igreja.codigo_totvs,
        igreja.desc_igreja,
        igreja.tipo_imovel || 'ALUGADO',
        igreja.endereco || '',
        igreja.bairro || '',
        igreja.municipio || '',
        igreja.estado || '',
        igreja.cep || '',
        igreja.link_google_maps || '',
        igreja.latitude,
        igreja.longitude,
        igreja.status || 'PENDENTE',
        igreja.codigo_totvs_pai || null,
        igreja.porte || 'LOCAL',
        igreja.dirigente_nome || null,
        igreja.dirigente_telefone || null,
        igreja.dirigente_email || null,
        igreja.dirigente_data_posse || null,
        igreja.financeira_nome || null,
        igreja.financeira_telefone || null,
        igreja.financeira_email || null,
        igreja.qtd_membros !== undefined ? igreja.qtd_membros : null,
        igreja.qtd_jovens !== undefined ? igreja.qtd_jovens : null,
        igreja.tipo_prebenda || 'NAO_PREBENDADA',
      ]);
      return;
    } catch (err) {
      console.error('Postgres error in criarIgrejaSingle:', err);
      throw err;
    }
  }

  // Fallback to In-Memory DB
  const alreadyExists = memoryDb.some((item) => item.codigo_totvs === igreja.codigo_totvs);
  if (alreadyExists) {
    throw new Error(`Igreja com código TOTVS ${igreja.codigo_totvs} já existe.`);
  }
  memoryDb.push({
    ...igreja,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function upsertContactsBulk(contacts: Array<{
  codigo_totvs: string;
  dirigente_nome?: string | null;
  dirigente_telefone?: string | null;
}>): Promise<{ updatedCount: number; insertedCount: number }> {
  await ensurePostgresTable();
  let updatedCount = 0;
  let insertedCount = 0;

  if (pool) {
    const client = await pool.connect();
    try {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
        const uniqueContacts = new Map<string, { dirigente_nome: string | null; dirigente_telefone: string | null }>();
        contacts.slice(i, i + CHUNK_SIZE).forEach((item) => {
          const codigo_totvs = item.codigo_totvs?.toString().trim();
          if (!codigo_totvs) return;
          uniqueContacts.set(codigo_totvs, {
            dirigente_nome: item.dirigente_nome?.toString().trim() || null,
            dirigente_telefone: item.dirigente_telefone?.toString().trim() || null,
          });
        });
        const chunk = Array.from(uniqueContacts, ([codigo_totvs, contact]) => ({ codigo_totvs, ...contact }));
        if (chunk.length === 0) continue;

        await client.query('BEGIN');
        const res = await client.query<{ is_inserted: boolean }>(`
          INSERT INTO igrejas (codigo_totvs, desc_igreja, dirigente_nome, dirigente_telefone, status)
          SELECT codigo_totvs, 'Igreja ' || codigo_totvs, dirigente_nome, dirigente_telefone, 'PENDENTE'
          FROM UNNEST($1::text[], $2::text[], $3::text[])
            AS contact(codigo_totvs, dirigente_nome, dirigente_telefone)
          ON CONFLICT (codigo_totvs) DO UPDATE SET
            dirigente_nome = COALESCE(EXCLUDED.dirigente_nome, igrejas.dirigente_nome),
            dirigente_telefone = COALESCE(EXCLUDED.dirigente_telefone, igrejas.dirigente_telefone),
            updated_at = CURRENT_TIMESTAMP
          WHERE (EXCLUDED.dirigente_nome IS NOT NULL AND EXCLUDED.dirigente_nome IS DISTINCT FROM igrejas.dirigente_nome)
             OR (EXCLUDED.dirigente_telefone IS NOT NULL AND EXCLUDED.dirigente_telefone IS DISTINCT FROM igrejas.dirigente_telefone)
          RETURNING (xmax = 0) AS is_inserted;
        `, [
          chunk.map((item) => item.codigo_totvs),
          chunk.map((item) => item.dirigente_nome),
          chunk.map((item) => item.dirigente_telefone),
        ]);
        insertedCount += res.rows.filter((row) => row.is_inserted).length;
        updatedCount += res.rows.filter((row) => !row.is_inserted).length;
        await client.query('COMMIT');
      }
      return { updatedCount, insertedCount };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      console.error('Postgres error in upsertContactsBulk:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback to In-Memory DB
  contacts.forEach((item) => {
    const totvs = item.codigo_totvs ? item.codigo_totvs.toString().trim() : '';
    if (!totvs) return;
    const existing = memoryDb.find((ig) => ig.codigo_totvs === totvs);
    if (existing) {
      if (item.dirigente_nome) existing.dirigente_nome = item.dirigente_nome.toString().trim();
      if (item.dirigente_telefone) existing.dirigente_telefone = item.dirigente_telefone.toString().trim();
      existing.updated_at = new Date().toISOString();
      updatedCount++;
    } else {
      memoryDb.push({
        codigo_totvs: totvs,
        desc_igreja: `Igreja ${totvs}`,
        tipo_imovel: 'ALUGADO',
        endereco: '',
        bairro: '',
        municipio: '',
        estado: '',
        cep: '',
        link_google_maps: '',
        latitude: null,
        longitude: null,
        status: 'PENDENTE',
        dirigente_nome: item.dirigente_nome ? item.dirigente_nome.toString().trim() : null,
        dirigente_telefone: item.dirigente_telefone ? item.dirigente_telefone.toString().trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      insertedCount++;
    }
  });

  return { updatedCount, insertedCount };
}
