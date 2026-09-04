import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIgrejas, getDistinctStates } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = verifySessionToken(cookieStore.get('session_token')?.value);

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const porte = searchParams.get('porte') || 'ALL';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') || searchParams.get('q') || '';

    const page = pageParam ? parseInt(pageParam, 10) || 1 : 1;
    // Default limit set to 50 records per page to minimize egress
    const rawLimit = parseInt(limitParam || '50', 10);
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);

    const [result, states] = await Promise.all([
      getIgrejas(
        { estado, status, porte, page, limit, search },
        [
          'id',
          'codigo_totvs',
          'desc_igreja',
          'estado',
          'municipio',
          'dirigente_nome',
          'dirigente_telefone',
          'financeira_nome',
          'financeira_telefone',
          'bairro',
          'endereco',
          'cep',
          'link_google_maps',
          'porte',
          'codigo_totvs_pai',
          'dirigente_email',
          'dirigente_data_posse',
          'financeira_email',
          'qtd_membros',
          'qtd_jovens',
          'tipo_prebenda',
          'tipo_imovel',
          'status',
        ]
      ),
      getDistinctStates(),
    ]);

    return NextResponse.json({
      success: true,
      igrejas: result.data,
      total: result.total,
      page,
      limit,
      states,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/admin/igrejas-completas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
