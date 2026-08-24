import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

// Força a revalidação no servidor do Next.js
export const revalidate = 86400; // 24 horas

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh') === 'true';

    const result = await getIgrejas({ status: 'VALIDADO' });

    // Se for refresh manual, envia cabeçalhos que FORÇAM a Vercel CDN a substituir o cache da borda
    const headers: Record<string, string> = isRefresh
      ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-cache',
          'Vercel-CDN-Cache-Control': 'no-cache',
          'x-middleware-skip': '1',
        }
      : {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          'CDN-Cache-Control': 'public, s-maxage=86400',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
        };

    return NextResponse.json(result, { headers });
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw error;
    }
    console.error('Erro ao buscar igrejas validadas:', error);
    return NextResponse.json([], { status: 500 });
  }
}
