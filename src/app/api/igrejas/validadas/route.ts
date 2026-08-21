import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh');

    // Busca TODAS as igrejas validadas sem limite de quantidade
    const data = await getIgrejas({ status: 'VALIDADO' });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': isRefresh
          ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
          : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar igrejas validadas:', error);
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
