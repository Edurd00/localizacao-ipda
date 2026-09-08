import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tvhclmidfphwsimnsewr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const getSupabaseClient = () => {
  if (!supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const estado = searchParams.get('estado') || 'ALL';
    const estadual = searchParams.get('sede') || searchParams.get('estadual') || 'ALL';
    const porte = searchParams.get('porte') || 'ALL';
    const statusFiltro = searchParams.get('status') || searchParams.get('status_envio') || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    if (!pool) {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from('igrejas').select('codigo_totvs, desc_igreja, municipio, estado, porte, codigo_totvs_pai, dirigente_nome, dirigente_telefone, status', { count: 'exact' }).neq('status', 'DESATIVADO');
        if (estado !== 'ALL' && estado !== '') {
          const ufs = estado.split(',').map((e) => e.trim()).filter(Boolean);
          if (ufs.length === 1) query = query.eq('estado', ufs[0]);
          else if (ufs.length > 1) query = query.in('estado', ufs);
        }
        if (porte !== 'ALL' && porte !== '') query = query.eq('porte', porte);
        if (search) query = query.or(`codigo_totvs.ilike.%${search}%,desc_igreja.ilike.%${search}%,dirigente_nome.ilike.%${search}%`);

        const { data: igrejasData, count } = await query.order('desc_igreja', { ascending: true }).range(offset, offset + limit - 1);

        const totvsList = (igrejasData || []).map((i) => i.codigo_totvs);
        const { data: submissoesData } = totvsList.length > 0
          ? await supabase.from('patrimonio_submissoes').select('id, codigo_totvs, data_envio, nome_responsavel, telefone_responsavel, ano_referencia, criado_em').in('codigo_totvs', totvsList)
          : { data: [] };

        const subMap = new Map((submissoesData || []).map((s) => [s.codigo_totvs, s]));

        let merged = (igrejasData || []).map((ig) => {
          const sub = subMap.get(ig.codigo_totvs);
          return {
            ...ig,
            submissao_id: sub ? sub.id : null,
            id: sub ? sub.id : null,
            data_envio: sub ? sub.data_envio : null,
            nome_responsavel: sub ? sub.nome_responsavel : null,
            telefone_responsavel: sub ? sub.telefone_responsavel : null,
            ano_referencia: sub ? sub.ano_referencia : null,
            criado_em: sub ? sub.criado_em : null,
          };
        });

        if (statusFiltro === 'ENVIADO') merged = merged.filter((item) => item.submissao_id !== null);
        else if (statusFiltro === 'PENDENTE') merged = merged.filter((item) => item.submissao_id === null);

        const totalIgrejas = count || merged.length;
        const recebidos = merged.filter((item) => item.submissao_id !== null).length;

        return NextResponse.json({
          success: true,
          data: merged,
          meta: {
            totalIgrejas,
            recebidos,
            pendentes: totalIgrejas - recebidos,
            percentual: totalIgrejas > 0 ? Math.round((recebidos / totalIgrejas) * 100) : 0,
            total: count || merged.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil((count || merged.length) / limit)),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: [],
        meta: { totalIgrejas: 0, recebidos: 0, pendentes: 0, percentual: 0, total: 0, page, limit, totalPages: 1 },
      });
    }

    const params: any[] = [];
    let paramIdx = 1;
    let cte = '';
    let baseFrom = 'igrejas i';

    // Filtro de Cascata Hierárquica (Sede)
    if (estadual !== 'ALL' && estadual !== '') {
      cte = `WITH RECURSIVE hierarchy AS (
        SELECT codigo_totvs FROM igrejas WHERE codigo_totvs = $${paramIdx}
        UNION
        SELECT ig.codigo_totvs FROM igrejas ig INNER JOIN hierarchy h ON ig.codigo_totvs_pai = h.codigo_totvs
      )`;
      baseFrom = `hierarchy h JOIN igrejas i ON h.codigo_totvs = i.codigo_totvs`;
      params.push(estadual);
      paramIdx++;
    }

    let whereClause = `WHERE i.status != 'DESATIVADO'`;

    // Filtro de Estados (Aceita UFs separadas por vírgula da Região Geográfica)
    if (estado !== 'ALL' && estado !== '') {
      const ufs = estado.split(',').map((e) => e.trim()).filter(Boolean);
      if (ufs.length === 1) {
        whereClause += ` AND i.estado = $${paramIdx}`;
        params.push(ufs[0]);
        paramIdx++;
      } else if (ufs.length > 1) {
        const placeholders = ufs.map((_, i) => `$${paramIdx + i}`).join(',');
        whereClause += ` AND i.estado IN (${placeholders})`;
        params.push(...ufs);
        paramIdx += ufs.length;
      }
    }

    // Filtro de Porte
    if (porte !== 'ALL' && porte !== '') {
      if (porte === 'LOCAL') {
        whereClause += ` AND (i.porte = 'LOCAL' OR (i.porte IS NULL AND UPPER(i.desc_igreja) NOT LIKE '%ESTADUAL%' AND UPPER(i.desc_igreja) NOT LIKE '%SETORIAL%' AND UPPER(i.desc_igreja) NOT LIKE '%CENTRAL%' AND UPPER(i.desc_igreja) NOT LIKE '%REGIONAL%'))`;
      } else {
        whereClause += ` AND (i.porte = $${paramIdx} OR (i.porte IS NULL AND UPPER(i.desc_igreja) LIKE $${paramIdx + 1}))`;
        params.push(porte, `%${porte}%`);
        paramIdx += 2;
      }
    }

    // Filtro de Envio (Cruzamento Patrimônio)
    if (statusFiltro === 'ENVIADO') {
      whereClause += ` AND s.id IS NOT NULL`;
    } else if (statusFiltro === 'PENDENTE') {
      whereClause += ` AND s.id IS NULL`;
    }

    // Filtro de Texto (Pesquisa Livre)
    if (search) {
      whereClause += ` AND (i.codigo_totvs ILIKE $${paramIdx} OR i.desc_igreja ILIKE $${paramIdx} OR i.municipio ILIKE $${paramIdx} OR i.dirigente_nome ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countQuery = `${cte} SELECT COUNT(*)::int as total FROM ${baseFrom} LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs ${whereClause}`;

    const dataQuery = `${cte}
      SELECT
        i.codigo_totvs, i.desc_igreja, i.municipio, i.estado, i.porte, i.codigo_totvs_pai,
        i.dirigente_nome, i.dirigente_telefone,
        s.id as submissao_id, s.data_envio, s.nome_responsavel, s.ano_referencia
      FROM ${baseFrom}
      LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs
      ${whereClause}
      ORDER BY i.desc_igreja ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    // Query de KPIs (Ignora busca de texto e status_envio para manter totais coerentes da região/sede)
    let kpiWhere = `WHERE i.status != 'DESATIVADO'`;
    const kpiParams: any[] = [];
    let kpiIdx = 1;

    if (estadual !== 'ALL' && estadual !== '') {
      kpiParams.push(estadual);
      kpiIdx++;
    }
    if (estado !== 'ALL' && estado !== '') {
      const ufs = estado.split(',').map((e) => e.trim()).filter(Boolean);
      if (ufs.length === 1) {
        kpiWhere += ` AND i.estado = $${kpiIdx}`;
        kpiParams.push(ufs[0]);
        kpiIdx++;
      } else if (ufs.length > 1) {
        const placeholders = ufs.map((_, i) => `$${kpiIdx + i}`).join(',');
        kpiWhere += ` AND i.estado IN (${placeholders})`;
        kpiParams.push(...ufs);
        kpiIdx += ufs.length;
      }
    }
    if (porte !== 'ALL' && porte !== '') {
      if (porte === 'LOCAL') {
        kpiWhere += ` AND (i.porte = 'LOCAL' OR (i.porte IS NULL AND UPPER(i.desc_igreja) NOT LIKE '%ESTADUAL%' AND UPPER(i.desc_igreja) NOT LIKE '%SETORIAL%'))`;
      } else {
        kpiWhere += ` AND (i.porte = $${kpiIdx} OR (i.porte IS NULL AND UPPER(i.desc_igreja) LIKE $${kpiIdx + 1}))`;
        kpiParams.push(porte, `%${porte}%`);
        kpiIdx += 2;
      }
    }

    const kpiQuery = `${cte} SELECT COUNT(i.codigo_totvs)::int AS total_igrejas, COUNT(s.id)::int AS recebidos FROM ${baseFrom} LEFT JOIN patrimonio_submissoes s ON i.codigo_totvs = s.codigo_totvs ${kpiWhere}`;

    const [kpiRes, countRes, dataRes] = await Promise.all([
      pool.query(kpiQuery, kpiParams),
      pool.query(countQuery, params),
      pool.query(dataQuery, [...params, limit, offset])
    ]);

    const totalIgrejas = parseInt(kpiRes.rows[0]?.total_igrejas || '0', 10);
    const recebidos = parseInt(kpiRes.rows[0]?.recebidos || '0', 10);
    const totalLines = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      meta: {
        totalIgrejas, recebidos, pendentes: totalIgrejas - recebidos,
        percentual: totalIgrejas > 0 ? Math.round((recebidos / totalIgrejas) * 100) : 0,
        total: totalLines, page, limit, totalPages: Math.max(1, Math.ceil(totalLines / limit))
      }
    });

  } catch (err: any) {
    console.error('API Error in GET /api/patrimonio/lista:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
