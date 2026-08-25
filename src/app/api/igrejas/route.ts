import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const [igrejas, states] = await Promise.all([
      getIgrejas({ estado, status }, [
        'id',
        'codigo_totvs',
        'desc_igreja',
        'tipo_imovel',
        'endereco',
        'bairro',
        'municipio',
        'estado',
        'cep',
        'link_google_maps',
        'latitude',
        'longitude',
        'status',
        'usuario_validador',
        'validado_por',
        'validado_em',
        'observacoes',
        'codigo_totvs_pai',
        'porte',
        'updated_at',
        'dirigente_nome',
        'dirigente_telefone',
        'dirigente_email',
        'financeira_nome',
        'financeira_telefone',
        'financeira_email',
        'dirigente_data_posse',
        'qtd_membros',
        'qtd_jovens',
        'tipo_prebenda'
      ]),
      getDistinctStates(),
    ]);

    return new NextResponse(
      JSON.stringify({
        success: true,
        igrejas,
        states,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
