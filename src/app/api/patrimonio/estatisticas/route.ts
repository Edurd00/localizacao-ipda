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
    const estadoFiltro = (searchParams.get('estado') || searchParams.get('conservacao') || '').trim().toUpperCase();
    const anoAtual = new Date().getFullYear();

    let whereClause = `WHERE (i.possui IS NULL OR UPPER(i.possui) = 'SIM' OR i.possui = 's' OR i.possui = 'true')`;
    const params: any[] = [];

    if (estadoFiltro) {
      whereClause += ` AND (UPPER(i.conservacao) = $1 OR UPPER(i.estado_conservacao) = $1)`;
      params.push(estadoFiltro);
    }

    if (pool) {
      try {
        const totalQuery = `SELECT COALESCE(SUM(i.quantidade), 0)::int AS total_itens FROM patrimonio_itens i ${whereClause}`;

        const conservacaoQuery = `
          SELECT
            COALESCE(NULLIF(UPPER(i.conservacao), ''), NULLIF(UPPER(i.estado_conservacao), ''), 'BOM') AS conservacao,
            COALESCE(SUM(i.quantidade), 0)::int AS quantidade
          FROM patrimonio_itens i
          ${whereClause}
          GROUP BY COALESCE(NULLIF(UPPER(i.conservacao), ''), NULLIF(UPPER(i.estado_conservacao), ''), 'BOM')
          ORDER BY quantidade DESC
        `;

        const categoriasQuery = `
          SELECT
            i.item_nome,
            COALESCE(SUM(i.quantidade), 0)::int AS quantidade
          FROM patrimonio_itens i
          ${whereClause}
          GROUP BY i.item_nome
          ORDER BY quantidade DESC
          LIMIT 15
        `;

        const templos2026Query = `
          SELECT COUNT(DISTINCT codigo_totvs)::int AS total_templos
          FROM patrimonio_submissoes
          WHERE ano_referencia = $1
        `;

        const [totalRes, conservacaoRes, categoriasRes, templosRes] = await Promise.all([
          pool.query(totalQuery, params),
          pool.query(conservacaoQuery, params),
          pool.query(categoriasQuery, params),
          pool.query(templos2026Query, [anoAtual]),
        ]);

        const totalItens = parseInt(totalRes.rows[0]?.total_itens || '0', 10);
        const totalTemplos2026 = parseInt(templosRes.rows[0]?.total_templos || '0', 10);
        const mediaPorTemplo = totalTemplos2026 > 0 ? Number((totalItens / totalTemplos2026).toFixed(1)) : 0;

        return NextResponse.json({
          success: true,
          data: {
            total_itens: totalItens,
            total_templos_com_submissao_2026: totalTemplos2026,
            media_itens_por_templo: mediaPorTemplo,
            itens_por_conservacao: conservacaoRes.rows || [],
            itens_por_categoria: categoriasRes.rows || [],
          },
        });
      } catch (poolErr) {
        console.error('Postgres error in GET /api/patrimonio/estatisticas:', poolErr);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      let query = supabase.from('patrimonio_itens').select('*');
      if (estadoFiltro) {
        query = query.or(`conservacao.ilike.${estadoFiltro},estado_conservacao.ilike.${estadoFiltro}`);
      }

      const { data: itensData } = await query;
      const { data: sub2026 } = await supabase.from('patrimonio_submissoes').select('codigo_totvs').eq('ano_referencia', anoAtual);

      const validItens = (itensData || []).filter((it) => {
        const val = String(it.possui || 'Sim').trim().toLowerCase();
        return val === 'sim' || val === 's' || val === 'true';
      });

      const totalItens = validItens.reduce((acc, it) => acc + (Number(it.quantidade) || 1), 0);
      const totalTemplos2026 = new Set((sub2026 || []).map((s) => s.codigo_totvs)).size;
      const mediaPorTemplo = totalTemplos2026 > 0 ? Number((totalItens / totalTemplos2026).toFixed(1)) : 0;

      const conservacaoMap = new Map<string, number>();
      const categoriaMap = new Map<string, number>();

      validItens.forEach((it) => {
        const cons = (it.conservacao || it.estado_conservacao || 'BOM').toUpperCase();
        const qtd = Number(it.quantidade) || 1;
        conservacaoMap.set(cons, (conservacaoMap.get(cons) || 0) + qtd);

        const cat = it.item_nome || it.item || 'Outros';
        categoriaMap.set(cat, (categoriaMap.get(cat) || 0) + qtd);
      });

      const itensPorConservacao = Array.from(conservacaoMap.entries()).map(([conservacao, quantidade]) => ({ conservacao, quantidade }));
      const itensPorCategoria = Array.from(categoriaMap.entries())
        .map(([item_nome, quantidade]) => ({ item_nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 15);

      return NextResponse.json({
        success: true,
        data: {
          total_itens: totalItens,
          total_templos_com_submissao_2026: totalTemplos2026,
          media_itens_por_templo: mediaPorTemplo,
          itens_por_conservacao: itensPorConservacao,
          itens_por_categoria: itensPorCategoria,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_itens: 0,
        total_templos_com_submissao_2026: 0,
        media_itens_por_templo: 0,
        itens_por_conservacao: [],
        itens_por_categoria: [],
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/patrimonio/estatisticas:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
