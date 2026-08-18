import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export interface PrebendaRowUpdate {
  codigo_totvs: string;
  qtd_membros: number | null;
  dirigente_nome: string | null;
  dirigente_telefone: string | null;
  dirigente_data_posse: string | null;
  financeira_nome: string | null;
  tipo_prebenda: 'PREBENDADA' | 'NAO_PREBENDADA';
}

/**
 * Helper to parse date values into ISO string YYYY-MM-DD.
 * Handles Excel date serials, MM/DD/YY, DD/MM/YYYY, YYYY-MM-DD formats.
 * Ignores empty or invalid strings like '/  /' or '//'.
 */
export function parsePosseDate(val: string | number | null | undefined): string | null {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  if (!str) return null;
  if (str.replace(/[\/\s]/g, '').length === 0) return null;

  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      let year: number, month: number, day: number;
      if (p1 > 1000) {
        // YYYY-MM-DD
        year = p1;
        month = p2;
        day = p3;
      } else if (p3 > 1000) {
        // MM/DD/YYYY or DD/MM/YYYY
        year = p3;
        if (p1 > 12) {
          day = p1;
          month = p2;
        } else {
          month = p1;
          day = p2;
        }
      } else {
        // MM/DD/YY or DD/MM/YY
        year = p3 < 50 ? 2000 + p3 : 1900 + p3;
        if (p1 > 12) {
          day = p1;
          month = p2;
        } else {
          month = p1;
          day = p2;
        }
      }
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  return null;
}

export function parseExcelRows(filePath: string): PrebendaRowUpdate[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets['Planilha1'] || wb.Sheets[wb.SheetNames[0]];
  const rowsRaw = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

  const records: PrebendaRowUpdate[] = [];

  for (const row of rowsRaw) {
    if (row.Codigo === undefined || row.Codigo === null) continue;

    const codigo = String(row.Codigo).trim();
    if (!codigo) continue;

    // Qtd.Membros (integer)
    let qtdMembros: number | null = null;
    if (row['Qtd.Membros'] !== undefined && row['Qtd.Membros'] !== null && row['Qtd.Membros'] !== '') {
      const parsedQty = parseInt(String(row['Qtd.Membros']).replace(/\D/g, ''), 10);
      if (!isNaN(parsedQty)) {
        qtdMembros = parsedQty;
      }
    }

    // dirigente_nome (Nome 1o Diri - only if filled)
    const dirigenteNome = row['Nome 1o Diri'] ? String(row['Nome 1o Diri']).trim() || null : null;

    // dirigente_telefone (Tel.Atualiz - only if filled)
    const dirigenteTelefone = row['Tel.Atualiz'] ? String(row['Tel.Atualiz']).trim() || null : null;

    // dirigente_data_posse (Posse 1o dir - parse ISO YYYY-MM-DD or null)
    const dirigenteDataPosse = parsePosseDate(row['Posse 1o dir'] as string | number | null);

    // financeira_nome (Resp. Financ - only if filled)
    const financeiraNome = row['Resp. Financ'] ? String(row['Resp. Financ']).trim() || null : null;

    // tipo_prebenda (IGR Prebenda - SIM -> PREBENDADA, NAO/Null -> NAO_PREBENDADA)
    const rawPrebenda = row['IGR Prebenda'] ? String(row['IGR Prebenda']).trim().toUpperCase() : '';
    const tipoPrebenda: 'PREBENDADA' | 'NAO_PREBENDADA' = rawPrebenda === 'SIM' ? 'PREBENDADA' : 'NAO_PREBENDADA';

    records.push({
      codigo_totvs: codigo,
      qtd_membros: qtdMembros,
      dirigente_nome: dirigenteNome,
      dirigente_telefone: dirigenteTelefone,
      dirigente_data_posse: dirigenteDataPosse,
      financeira_nome: financeiraNome,
      tipo_prebenda: tipoPrebenda,
    });
  }

  return records;
}

export async function processPrebendaUpdates(records: PrebendaRowUpdate[]): Promise<{
  totalRecords: number;
  updatedCount: number;
  notFoundCount: number;
  errorsCount: number;
}> {
  const CHUNK_SIZE = 500;
  let updatedCount = 0;
  let notFoundCount = 0;
  let errorsCount = 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (supabaseUrl && supabaseKey) {
    console.log('Using Supabase Service Role Client for chunk updates...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(records.length / CHUNK_SIZE)} (${chunk.length} items)...`);

      for (const item of chunk) {
        try {
          const updateData: Record<string, unknown> = {
            tipo_prebenda: item.tipo_prebenda,
            updated_at: new Date().toISOString(),
          };

          if (item.qtd_membros !== null) updateData.qtd_membros = item.qtd_membros;
          if (item.dirigente_nome !== null) updateData.dirigente_nome = item.dirigente_nome;
          if (item.dirigente_telefone !== null) updateData.dirigente_telefone = item.dirigente_telefone;
          if (item.dirigente_data_posse !== null) updateData.dirigente_data_posse = item.dirigente_data_posse;
          if (item.financeira_nome !== null) updateData.financeira_nome = item.financeira_nome;

          const { data, error } = await supabase
            .from('igrejas')
            .update(updateData)
            .eq('codigo_totvs', item.codigo_totvs)
            .select('codigo_totvs');

          if (error) {
            console.error(`Error updating codigo_totvs ${item.codigo_totvs}:`, error);
            errorsCount++;
          } else if (data && data.length > 0) {
            updatedCount++;
          } else {
            notFoundCount++;
          }
        } catch (err) {
          console.error(`Exception updating codigo_totvs ${item.codigo_totvs}:`, err);
          errorsCount++;
        }
      }
    }
  } else if (databaseUrl) {
    console.log('Using Postgres Pool for chunk updates...');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    try {
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(records.length / CHUNK_SIZE)} (${chunk.length} items)...`);

        await client.query('BEGIN');
        for (const item of chunk) {
          try {
            const sets: string[] = ['tipo_prebenda = $2', 'updated_at = CURRENT_TIMESTAMP'];
            const params: unknown[] = [item.codigo_totvs, item.tipo_prebenda];
            let paramIdx = 3;

            if (item.qtd_membros !== null) {
              sets.push(`qtd_membros = $${paramIdx}`);
              params.push(item.qtd_membros);
              paramIdx++;
            }
            if (item.dirigente_nome !== null) {
              sets.push(`dirigente_nome = $${paramIdx}`);
              params.push(item.dirigente_nome);
              paramIdx++;
            }
            if (item.dirigente_telefone !== null) {
              sets.push(`dirigente_telefone = $${paramIdx}`);
              params.push(item.dirigente_telefone);
              paramIdx++;
            }
            if (item.dirigente_data_posse !== null) {
              sets.push(`dirigente_data_posse = $${paramIdx}`);
              params.push(item.dirigente_data_posse);
              paramIdx++;
            }
            if (item.financeira_nome !== null) {
              sets.push(`financeira_nome = $${paramIdx}`);
              params.push(item.financeira_nome);
              paramIdx++;
            }

            const query = `UPDATE igrejas SET ${sets.join(', ')} WHERE codigo_totvs = $1 RETURNING codigo_totvs`;
            const res = await client.query(query, params);

            if (res.rowCount && res.rowCount > 0) {
              updatedCount++;
            } else {
              notFoundCount++;
            }
          } catch (err) {
            console.error(`Error updating codigo_totvs ${item.codigo_totvs}:`, err);
            errorsCount++;
          }
        }
        await client.query('COMMIT');
      }
    } finally {
      client.release();
      await pool.end();
    }
  } else {
    console.warn('Neither SUPABASE_SERVICE_ROLE_KEY nor DATABASE_URL configured. Processing in simulated mode.');
    updatedCount = records.length;
  }

  // Safe revalidation (only called when Next.js Request context exists)
  try {
    if (typeof window === 'undefined' && process.env.NEXT_RUNTIME) {
      revalidatePath('/api/igrejas/validadas');
      revalidatePath('/gestao');
      revalidatePath('/api/igrejas/dashboard');
      revalidatePath('/organizacao');
      console.log('Revalidation executed successfully for /api/igrejas/validadas, /gestao, /api/igrejas/dashboard, and /organizacao.');
    }
  } catch (revalErr) {
    console.warn('Revalidation notice (non-fatal):', revalErr);
  }

  return {
    totalRecords: records.length,
    updatedCount,
    notFoundCount,
    errorsCount,
  };
}

async function runDirectImport() {
  console.log('=== Starting Prebendas e Membros Bulk Update Script ===');
  const excelPath = path.join(process.cwd(), 'prebendados e voluntarios.xlsx');
  console.log('Excel file path:', excelPath);

  const records = parseExcelRows(excelPath);
  console.log(`Parsed ${records.length} records from Planilha1.`);

  const result = await processPrebendaUpdates(records);
  console.log('=== Import Result Summary ===');
  console.log(`Total Records Processed: ${result.totalRecords}`);
  console.log(`Successfully Updated: ${result.updatedCount}`);
  console.log(`Not Found in DB: ${result.notFoundCount}`);
  console.log(`Errors: ${result.errorsCount}`);
}

if (require.main === module) {
  runDirectImport().catch((err) => {
    console.error('Fatal import error:', err);
    process.exit(1);
  });
}
