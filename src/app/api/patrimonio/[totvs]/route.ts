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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ totvs: string }> | { totvs: string } }
) {
  try {
    const resolvedParams = await params;
    const totvs = resolvedParams?.totvs;

    if (!totvs) {
      return NextResponse.json({ data: null });
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('patrimonio_submissoes')
        .select('*, patrimonio_itens(*)')
        .eq('codigo_totvs', totvs)
        .order('ano_referencia', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return NextResponse.json({ data: data[0] });
      }
    }

    // Fallback via pg pool if Supabase client is not configured or returned no result
    if (pool) {
      try {
        const query = `
          SELECT s.*,
            COALESCE(
              json_agg(i.*) FILTER (WHERE i.id IS NOT NULL),
              '[]'::json
            ) AS patrimonio_itens
          FROM patrimonio_submissoes s
          LEFT JOIN patrimonio_itens i ON s.id = i.submissao_id
          WHERE s.codigo_totvs = $1
          GROUP BY s.id
          ORDER BY s.ano_referencia DESC
          LIMIT 1
        `;
        const res = await pool.query(query, [totvs]);
        if (res.rows && res.rows.length > 0) {
          return NextResponse.json({ data: res.rows[0] });
        }
      } catch (poolErr) {
        console.error('Postgres pool error in GET /api/patrimonio:', poolErr);
      }
    }

    return NextResponse.json({ data: null });
  } catch (err) {
    console.error('Error in GET /api/patrimonio/[totvs]:', err);
    return NextResponse.json({ data: null }, { status: 500 });
  }
}
