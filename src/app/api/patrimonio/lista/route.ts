import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pool } from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tvhclmidfphwsimnsewr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
          LEFT JOIN igrejas i ON s.codigo_totvs = i.codigo_totvs
        `;
        let dataQuery = `
          SELECT
            s.*,
            i.desc_igreja,
            i.municipio
          FROM patrimonio_submissoes s
          LEFT JOIN igrejas i ON s.codigo_totvs = i.codigo_totvs
        `;

        const params: (string | number)[] = [];
        let paramIdx = 1;

        if (search) {
          const whereClause = ` WHERE (s.codigo_totvs ILIKE $${paramIdx} OR i.desc_igreja ILIKE $${paramIdx} OR s.nome_responsavel ILIKE $${paramIdx})`;
          countQuery += whereClause;
          dataQuery += whereClause;
          params.push(`%${search}%`);
          paramIdx++;
        }

        dataQuery += ` ORDER BY COALESCE(s.data_envio, s.criado_em, s.created_at) DESC NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
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
        .select('*, igrejas(desc_igreja, municipio)', { count: 'exact' });

      if (search) {
        query = query.or(`codigo_totvs.ilike.%${search}%,nome_responsavel.ilike.%${search}%`);
      }

      query = query
        .order('data_envio', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        const formattedData = data.map((item: any) => ({
          ...item,
          desc_igreja: item.igrejas?.desc_igreja || null,
          municipio: item.igrejas?.municipio || null,
        }));

        const total = count || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
          success: true,
          data: formattedData,
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
