import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh') === 'true' || searchParams.has('refresh') || searchParams.has('t');

    // Busca TODAS as igrejas validadas sem limite de linha
    const igrejas = await getIgrejas({ status: 'VALIDADO' });

    const cacheHeader = isRefresh
      ? 'no-store, max-age=0, must-revalidate'
      : 'public, s-maxage=3600, stale-while-revalidate=86400';

    return NextResponse.json(
      {
        success: true,
        igrejas,
      },
      {
        headers: {
          'Cache-Control': cacheHeader,
        },
      }
    );
  } catch (err: unknown) {
    console.error('Erro ao buscar igrejas validadas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
