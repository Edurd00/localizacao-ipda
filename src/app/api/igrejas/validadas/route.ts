import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

// Desativa a renderização dinâmica forçada no servidor
export const revalidate = 86400; // 24 Horas em Segundos

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isManualRefresh = searchParams.has('refresh');

    const result = await getIgrejas({ status: 'VALIDADO' });

    // Se o usuário clicar no botão "Recarregar", furamos o cache
    // Nos acessos comuns, servimos 100% da Vercel Edge CDN
    const cacheHeader = isManualRefresh
      ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
      : 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': cacheHeader,
        'CDN-Cache-Control': cacheHeader,
        'Vercel-CDN-Cache-Control': cacheHeader,
      },
    });
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw error;
    }
    console.error('Erro na API publica:', error);
    return NextResponse.json([], { status: 500 });
  }
}
