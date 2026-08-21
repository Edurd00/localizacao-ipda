import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const igrejas = await getIgrejas({ status: 'VALIDADO' }, [
      'id',
      'codigo_totvs',
      'desc_igreja',
      'latitude',
      'longitude',
      'status',
      'porte',
      'codigo_totvs_pai',
      'estado',
      'municipio',
      'tipo_imovel',
      'endereco',
      'bairro',
      'cep',
      'link_google_maps',
      'usuario_validador',
      'validado_por',
      'validado_em',
      'updated_at',
      'dirigente_nome',
      'dirigente_telefone',
      'dirigente_email',
      'dirigente_data_posse',
      'financeira_nome',
      'financeira_telefone',
      'financeira_email',
      'qtd_membros',
      'qtd_jovens',
      'tipo_prebenda',
    ]);
    const data = {
      success: true,
      igrejas,
    };
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, s-maxage=3600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/validadas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
