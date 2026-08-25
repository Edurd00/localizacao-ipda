import { NextResponse } from 'next/server';
import { getIgrejasForMap } from '@/lib/db';

export const revalidate = 86400; // 24 Horas de Cache na Vercel CDN

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh') === 'true';

    const result = await getIgrejasForMap();

    // Se for refresh manual do botão, ignora o cache; caso contrário, usa CDN Edge
    const cacheHeader = isRefresh
      ? 'public, max-age=0, s-maxage=0, must-revalidate'
      : 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': cacheHeader,
        'CDN-Cache-Control': cacheHeader,
        'Vercel-CDN-Cache-Control': cacheHeader,
      },
    });
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API pública:', error);
    return NextResponse.json([], { status: 500 });
  }
}
