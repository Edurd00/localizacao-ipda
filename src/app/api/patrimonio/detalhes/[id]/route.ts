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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ success: true, data: [] });
    }

    if (pool) {
      try {
        const query = `
          SELECT *
          FROM patrimonio_itens
          WHERE submissao_id = $1
          ORDER BY id ASC
        `;
        const res = await pool.query(query, [id]);
        return NextResponse.json({ success: true, data: res.rows || [] });
      } catch (poolErr) {
        console.error('Postgres pool error in GET /api/patrimonio/detalhes/[id]:', poolErr);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('patrimonio_itens')
        .select('*')
        .eq('submissao_id', id)
        .order('id', { ascending: true });

      if (!error && data) {
        return NextResponse.json({ success: true, data });
      }
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    console.error('Error in GET /api/patrimonio/detalhes/[id]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar itens de patrimônio' },
      { status: 500 }
    );
  }
}
