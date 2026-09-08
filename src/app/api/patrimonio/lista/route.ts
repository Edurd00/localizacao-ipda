import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pool } from '@/lib/db';

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
    const estado = (searchParams.get('estado') || 'ALL').trim();
    const porte = (searchParams.get('porte') || 'ALL').trim();
    const statusEnvio = (searchParams.get('status_envio') || searchParams.get('statusEnvio') || 'ALL').trim().toUpperCase();

    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20)) : 20;
    const offset = (page - 1) * limit;

    // Try via Postgres pool first
    if (pool) {
      try {
        let baseWhere = ` WHERE UPPER(COALESCE(i.status, '')) != 'DESATIVADO'`;
        const baseParams: (string | number)[] = [];
        let pIdx = 1;

        if (estado && estado !== 'ALL') {
          baseWhere += ` AND i.estado = $${pIdx}`;
          baseParams.push(estado);
          pIdx++;
        }

        if (porte && porte !== 'ALL') {
          baseWhere += ` AND (i.porte = $${pIdx} OR (i.porte IS NULL AND UPPER(i.desc_igreja) LIKE $${pIdx + 1}))`;
          baseParams.push(porte, `%${porte}%`);
          pIdx += 2;
        }

        if (search) {
          baseWhere += ` AND (i.codigo_totvs ILIKE $${pIdx} OR i.desc_igreja ILIKE $${pIdx} OR i.municipio ILIKE $${pIdx} OR COALESCE(i.dirigente_nome, '') ILIKE $${pIdx} OR COALESCE(s.nome_responsavel, '') ILIKE $${pIdx})`;
          baseParams.push(`%${search}%`);
          pIdx++;
        }

        const subquery = `
          LEFT JOIN (
            SELECT DISTINCT ON (codigo_totvs) id, codigo_totvs, data_envio, nome_responsavel, telefone_responsavel, ano_referencia, criado_em
            FROM patrimonio_submissoes
            ORDER BY codigo_totvs, data_envio DESC NULLS LAST
          ) s ON i.codigo_totvs = s.codigo_totvs
        `;

        // Stats Query (KPIs based on baseWhere without statusEnvio filter)
        const statsQuery = `
          SELECT
            COUNT(*)::int AS total_igrejas,
            COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END)::int AS recebidos,
            COUNT(CASE WHEN s.id IS NULL THEN 1 END)::int AS pendentes
          FROM igrejas i
          ${subquery}
          ${baseWhere}
        `;

        let dataWhere = baseWhere;
        const dataParams = [...baseParams];

        if (statusEnvio === 'ENVIADO') {
          dataWhere += ` AND s.id IS NOT NULL`;
        } else if (statusEnvio === 'PENDENTE') {
          dataWhere += ` AND s.id IS NULL`;
        }

        const countQuery = `
          SELECT COUNT(*)::int AS total
          FROM igrejas i
          ${subquery}
          ${dataWhere}
        `;

        let dataQuery = `
          SELECT
            i.codigo_totvs,
            i.desc_igreja,
            i.municipio,
            i.estado,
            i.porte,
            i.codigo_totvs_pai,
            i.dirigente_nome,
            i.dirigente_telefone,
            s.id AS submissao_id,
            s.id AS id,
            s.data_envio,
            s.nome_responsavel,
            s.telefone_responsavel,
            s.ano_referencia,
            s.criado_em
          FROM igrejas i
          ${subquery}
          ${dataWhere}
          ORDER BY
            CASE WHEN s.id IS NOT NULL THEN 0 ELSE 1 END,
            s.data_envio DESC NULLS LAST,
            i.desc_igreja ASC
          LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}
        `;

        const queryParamsWithPagination = [...dataParams, limit, offset];

        const [statsRes, countRes, dataRes] = await Promise.all([
          pool.query(statsQuery, baseParams),
          pool.query(countQuery, dataParams),
          pool.query(dataQuery, queryParamsWithPagination),
        ]);

        const totalIgrejas = statsRes.rows[0]?.total_igrejas || 0;
        const recebidos = statsRes.rows[0]?.recebidos || 0;
        const pendentes = statsRes.rows[0]?.pendentes || 0;
        const percentual = totalIgrejas > 0 ? Number(((recebidos / totalIgrejas) * 100).toFixed(1)) : 0;

        const total = countRes.rows[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
          success: true,
          data: dataRes.rows,
          meta: {
            totalIgrejas,
            recebidos,
            pendentes,
            percentual,
            total,
            page,
            limit,
            totalPages,
          },
        });
      } catch (poolErr) {
        console.error('Postgres pool error in GET /api/patrimonio/lista:', poolErr);
      }
    }

    // Fallback via Supabase Client
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: igrejas, error: igrejasErr } = await supabase
        .from('igrejas')
        .select('codigo_totvs, desc_igreja, municipio, estado, porte, codigo_totvs_pai, dirigente_nome, dirigente_telefone, status');

      const { data: submissoes } = await supabase
        .from('patrimonio_submissoes')
        .select('*');

      if (!igrejasErr && igrejas) {
        const subMap = new Map<string, any>();
        if (submissoes) {
          submissoes.forEach((sub) => {
            const existing = subMap.get(sub.codigo_totvs);
            if (!existing || new Date(sub.data_envio || 0) > new Date(existing.data_envio || 0)) {
              subMap.set(sub.codigo_totvs, sub);
            }
          });
        }

        let list = igrejas
          .filter((ig) => String(ig.status || '').toUpperCase() !== 'DESATIVADO')
          .map((ig) => {
            const sub = subMap.get(ig.codigo_totvs);
            return {
              codigo_totvs: ig.codigo_totvs,
              desc_igreja: ig.desc_igreja,
              municipio: ig.municipio,
              estado: ig.estado,
              porte: ig.porte,
              codigo_totvs_pai: ig.codigo_totvs_pai,
              dirigente_nome: ig.dirigente_nome,
              dirigente_telefone: ig.dirigente_telefone,
              submissao_id: sub?.id || null,
              id: sub?.id || null,
              data_envio: sub?.data_envio || null,
              nome_responsavel: sub?.nome_responsavel || null,
              telefone_responsavel: sub?.telefone_responsavel || null,
              ano_referencia: sub?.ano_referencia || null,
              criado_em: sub?.criado_em || null,
            };
          });

        if (estado && estado !== 'ALL') {
          list = list.filter((item) => item.estado === estado);
        }
        if (porte && porte !== 'ALL') {
          list = list.filter((item) => item.porte === porte);
        }
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (item) =>
              (item.codigo_totvs || '').toLowerCase().includes(s) ||
              (item.desc_igreja || '').toLowerCase().includes(s) ||
              (item.municipio || '').toLowerCase().includes(s) ||
              (item.dirigente_nome || '').toLowerCase().includes(s) ||
              (item.nome_responsavel || '').toLowerCase().includes(s)
          );
        }

        const totalIgrejas = list.length;
        const recebidos = list.filter((item) => item.submissao_id !== null).length;
        const pendentes = totalIgrejas - recebidos;
        const percentual = totalIgrejas > 0 ? Number(((recebidos / totalIgrejas) * 100).toFixed(1)) : 0;

        if (statusEnvio === 'ENVIADO') {
          list = list.filter((item) => item.submissao_id !== null);
        } else if (statusEnvio === 'PENDENTE') {
          list = list.filter((item) => item.submissao_id === null);
        }

        const total = list.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const paginatedData = list.slice(offset, offset + limit);

        return NextResponse.json({
          success: true,
          data: paginatedData,
          meta: {
            totalIgrejas,
            recebidos,
            pendentes,
            percentual,
            total,
            page,
            limit,
            totalPages,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalIgrejas: 0,
        recebidos: 0,
        pendentes: 0,
        percentual: 0,
        total: 0,
        page,
        limit,
        totalPages: 1,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/patrimonio/lista:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao listar patrimônios das igrejas' },
      { status: 500 }
    );
  }
}
