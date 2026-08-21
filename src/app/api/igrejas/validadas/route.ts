import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  try {
    let isRefresh = false;
    if (request?.url) {
      const { searchParams } = new URL(request.url);
      isRefresh = searchParams.get('refresh') === 'true';
    }

    // Busca TODAS as igrejas validadas sem limite de quantidade
    const data = await getIgrejas({ status: 'VALIDADO' });

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': isRefresh
          ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
          : 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Erro na conexao com o banco:', error);
    return NextResponse.json([], { status: 200 });
  }
}
