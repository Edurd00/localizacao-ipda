import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isManualRefresh = searchParams.has('refresh');

    const columns = [
      'id',
      'codigo_totvs',
      'desc_igreja',
      'tipo_imovel',
      'endereco',
      'bairro',
      'municipio',
      'estado',
      'cep',
      'latitude',
      'longitude',
      'link_google_maps',
      'status',
      'codigo_totvs_pai',
      'porte',
    ];

    const result = await getIgrejas({ status: 'VALIDADO' }, columns);

    const cacheHeader = isManualRefresh
      ? 'no-store, no-cache, must-revalidate'
      : 'public, s-maxage=86400, stale-while-revalidate=604800';

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': cacheHeader,
        'CDN-Cache-Control': cacheHeader,
        'Vercel-CDN-Cache-Control': cacheHeader,
      },
    });
  } catch (error) {
    console.error('Erro na API publica de igrejas:', error);
    return NextResponse.json([], { status: 500 });
  }
}
