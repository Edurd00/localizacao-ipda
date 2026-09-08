import { NextRequest, NextResponse } from 'next/server';
import { pool, getIgrejas } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const estado = searchParams.get('estado') || 'ALL';
    const porte = searchParams.get('porte') || 'ALL';
    const statusFiltro = searchParams.get('status') || 'ALL'; // PENDENTE ou ENVIADO
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Tentar fazer a query via POOL (Postgres Nativo)
    if (pool) {
      try {
        let whereClause = `WHERE i.status != 'DESATIVADO'`;
        const params: any[] = [];
        let paramIdx = 1;

        if (estado !== 'ALL') {
          whereClause += ` AND i.estado = $${paramIdx}`;
          params.push(estado);
          paramIdx++;
        }

        if (porte !== 'ALL') {
          if (porte === 'LOCAL') {
            whereClause += ` AND (i.porte = 'LOCAL' OR (i.porte IS NULL AND UPPER(i.desc_igreja) NOT LIKE '%ESTADUAL%' AND UPPER(i.desc_igreja) NOT LIKE '%SETORIAL%' AND UPPER(i.desc_igreja) NOT LIKE '%CENTRAL%' AND UPPER(i.desc_igreja) NOT LIKE '%REGIONAL%'))`;
          } else {
            whereClause += ` AND (i.porte = $${paramIdx} OR (i.porte IS NULL AND UPPER(i.desc_igreja) LIKE $${paramIdx+1}))`;
            params.push(porte, `%${porte}%`);
            paramIdx += 2;
          }
        }

        if (statusFiltro === 'ENVIADO') {
          whereClause += ` AND s.id IS NOT NULL`;
        } else if (statusFiltro === 'PENDENTE') {
          whereClause += ` AND s.id IS NULL`;
        }

        if (search) {
          whereClause += ` AND (i.codigo_totvs ILIKE $${paramIdx} OR i.desc_igreja ILIKE $${paramIdx} OR i.municipio ILIKE $${paramIdx} OR i.dirigente_nome ILIKE $${paramIdx})`;
          params.push(`%${search}%`);
          paramIdx++;
        }

        const countQuery = `
          SELECT 
            COUNT(i.codigo_totvs)::int AS total_igrejas,
            COUNT(s.id)::int AS recebidos
          FROM igrejas i
          LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs
          ${whereClause.replace(/AND s\.id IS NOT NULL|AND s\.id IS NULL/g, '')} -- Conta o total real sem o filtro de status para o KPI
        `;

        const dataQuery = `
          SELECT 
            i.codigo_totvs, i.desc_igreja, i.municipio, i.estado, i.porte, i.codigo_totvs_pai,
            i.dirigente_nome, i.dirigente_telefone,
            s.id as submissao_id, s.data_envio
          FROM igrejas i
          LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs
          ${whereClause}
          ORDER BY i.desc_igreja ASC
          LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `;

        const [countRes, dataRes] = await Promise.all([
          pool.query(countQuery, params.slice(0, paramIdx - (search ? 2 : 1))), // Remove search/limit params for count if needed
          pool.query(dataQuery, [...params, limit, (page - 1) * limit])
        ]);

        // Fix de contagem correta para o filtro principal (KPIs)
        const totalKPIQuery = await pool.query(`
          SELECT COUNT(i.codigo_totvs)::int AS total_igrejas, COUNT(s.id)::int AS recebidos 
          FROM igrejas i LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs 
          WHERE i.status != 'DESATIVADO'
        `);
        
        const totalIgrejas = totalKPIQuery.rows[0].total_igrejas || 0;
        const recebidos = totalKPIQuery.rows[0].recebidos || 0;
        const pendentes = totalIgrejas - recebidos;
        const percentual = totalIgrejas > 0 ? Math.round((recebidos / totalIgrejas) * 100) : 0;

        return NextResponse.json({
          success: true,
          data: dataRes.rows,
          meta: { 
            totalIgrejas, 
            recebidos, 
            pendentes, 
            percentual,
            totalFiltro: dataRes.rowCount // Total de linhas devolvidas na tabela
          }
        });
      } catch (poolErr) {
        console.error('Postgres Error:', poolErr);
      }
    }

    // Fallback: Se o Pool falhar, vamos retornar um fallback vazio (ou usar a lib nativa)
    return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: 'Erro interno da API' }, { status: 500 });
  }
}