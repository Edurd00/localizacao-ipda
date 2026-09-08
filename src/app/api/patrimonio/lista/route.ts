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
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20)) : 20;
    const offset = (page - 1) * limit;

    // Try via Postgres pool first if available
    if (pool) {
      try {
        let countQuery = `
          SELECT COUNT(*)::int AS total
          FROM patrimonio_submissoes s
        `;
        let dataQuery = `
          SELECT s.*
          FROM patrimonio_submissoes s
        `;

        const params: (string | number)[] = [];
        let paramIdx = 1;

        if (search) {
          const whereClause = ` WHERE (s.codigo_totvs ILIKE $${paramIdx} OR s.nome_responsavel ILIKE $${paramIdx})`;
          countQuery += whereClause;
          dataQuery += whereClause;
          params.push(`%${search}%`);
          paramIdx++;
        }

        dataQuery += ` ORDER BY s.data_envio DESC NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        const dataParams = [...params, limit, offset];

        const [countRes, dataRes] = await Promise.all([
          pool.query(countQuery, params),
          pool.query(dataQuery, dataParams)
        ]);

        const total = countRes.rows[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
          success: true,
          data: dataRes.rows,
          meta: {
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
      let query = supabase
        .from('patrimonio_submissoes')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`codigo_totvs.ilike.%${search}%,nome_responsavel.ilike.%${search}%`);
      }

      query = query
        .order('data_envio', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        const total = count || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
          success: true,
          data,
          meta: {
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
        total: 0,
        page,
        limit,
        totalPages: 1,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/patrimonio/lista:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao listar submissões de patrimônio' },
      { status: 500 }
    );
  }
}
