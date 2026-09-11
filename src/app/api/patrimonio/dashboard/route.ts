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
    const anoAtual = new Date().getFullYear();

    if (pool) {
      try {
        const [ativasRes, sub2026Res, dias7Res, recenteRes] = await Promise.all([
          pool.query(`SELECT COUNT(*)::int AS total FROM igrejas WHERE status != 'DESATIVADO'`),
          pool.query(`SELECT COUNT(DISTINCT codigo_totvs)::int AS total FROM patrimonio_submissoes WHERE ano_referencia = $1`, [anoAtual]),
          pool.query(`SELECT COUNT(*)::int AS total FROM patrimonio_submissoes WHERE data_envio >= NOW() - INTERVAL '7 days'`),
          pool.query(`
            SELECT
              s.id,
              s.codigo_totvs,
              COALESCE(i.desc_igreja, 'Igreja TOTVS ' || s.codigo_totvs) AS desc_igreja,
              i.municipio,
              i.estado,
              s.nome_responsavel,
              s.telefone_responsavel,
              s.ano_referencia,
              s.data_envio,
              s.criado_em
            FROM patrimonio_submissoes s
            LEFT JOIN igrejas i ON LOWER(s.codigo_totvs) = LOWER(i.codigo_totvs)
            ORDER BY s.data_envio DESC
            LIMIT 20
          `),
        ]);

        const totalIgrejasAtivas = parseInt(ativasRes.rows[0]?.total || '0', 10);
        const submissoes2026 = parseInt(sub2026Res.rows[0]?.total || '0', 10);
        const submissoesUltimos7Dias = parseInt(dias7Res.rows[0]?.total || '0', 10);

        return NextResponse.json({
          success: true,
          data: {
            total_igrejas_ativas: totalIgrejasAtivas,
            submissoes_2026: submissoes2026,
            submissoes_ultimos_7_dias: submissoesUltimos7Dias,
            percentual_cobertura_2026: totalIgrejasAtivas > 0 ? Math.round((submissoes2026 / totalIgrejasAtivas) * 100) : 0,
            historico_recente: recenteRes.rows || [],
          },
        });
      } catch (poolErr) {
        console.error('Postgres error in GET /api/patrimonio/dashboard:', poolErr);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const [{ count: totalAtivas }, { data: sub2026 }, { data: recentes }] = await Promise.all([
        supabase.from('igrejas').select('codigo_totvs', { count: 'exact', head: true }).neq('status', 'DESATIVADO'),
        supabase.from('patrimonio_submissoes').select('codigo_totvs, data_envio').eq('ano_referencia', anoAtual),
        supabase.from('patrimonio_submissoes').select('id, codigo_totvs, nome_responsavel, telefone_responsavel, ano_referencia, data_envio, criado_em').order('data_envio', { ascending: false }).limit(20),
      ]);

      const totvsSet2026 = new Set((sub2026 || []).map((s) => s.codigo_totvs));
      const submissoes2026 = totvsSet2026.size;

      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const submissoesUltimos7Dias = (sub2026 || []).filter((s) => s.data_envio && new Date(s.data_envio) >= seteDiasAtras).length;

      const totvsRecentes = (recentes || []).map((r) => r.codigo_totvs);
      const { data: igrejasData } = totvsRecentes.length > 0
        ? await supabase.from('igrejas').select('codigo_totvs, desc_igreja, municipio, estado').in('codigo_totvs', totvsRecentes)
        : { data: [] };

      const igMap = new Map((igrejasData || []).map((i) => [i.codigo_totvs, i]));

      const historicoComIgreja = (recentes || []).map((r) => {
        const ig = igMap.get(r.codigo_totvs);
        return {
          ...r,
          desc_igreja: ig ? ig.desc_igreja : `Igreja TOTVS ${r.codigo_totvs}`,
          municipio: ig ? ig.municipio : null,
          estado: ig ? ig.estado : null,
        };
      });

      const totalIgrejasAtivas = totalAtivas || 0;

      return NextResponse.json({
        success: true,
        data: {
          total_igrejas_ativas: totalIgrejasAtivas,
          submissoes_2026: submissoes2026,
          submissoes_ultimos_7_dias: submissoesUltimos7Dias,
          percentual_cobertura_2026: totalIgrejasAtivas > 0 ? Math.round((submissoes2026 / totalIgrejasAtivas) * 100) : 0,
          historico_recente: historicoComIgreja,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_igrejas_ativas: 0,
        submissoes_2026: 0,
        submissoes_ultimos_7_dias: 0,
        percentual_cobertura_2026: 0,
        historico_recente: [],
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/patrimonio/dashboard:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
