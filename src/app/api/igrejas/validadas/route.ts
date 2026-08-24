import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

// Permite o cache estático no servidor/CDN da Vercel
export const revalidate = 86400; // 24 horas

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh') === 'true';

    const result = await getIgrejas({ status: 'VALIDADO' });

    console.log(`[API LOG] Total de igrejas retornadas do banco: ${result.length}`);

    // Se for Refresh Manual (botão do mapa): ignora o cache e busca no banco
    // Acessos normais/F5: serve 100% da Vercel CDN (Consumo ZERO no Supabase)
    const cacheHeader = isRefresh
      ? 'no-cache, no-store, must-revalidate'
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
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
