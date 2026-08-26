import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';
import { unstable_cache } from 'next/cache';

const getOrganizacaoDataCacheada = unstable_cache(
  async () => {
    const states = await getDistinctStates();
    const allChurches = await getIgrejas();
    const churches = allChurches.filter((ig) => ig.status !== 'DESATIVADO');
    return {
      states: states.filter(Boolean),
      churches,
    };
  },
  ['organizacao-data-key'],
  { tags: ['organizacao-tag'], revalidate: 86400 }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    const cachedData = await getOrganizacaoDataCacheada();

    if (!estado) {
      return NextResponse.json({
        success: true,
        states: cachedData.states,
      });
    }

    return NextResponse.json({
      success: true,
      churches: cachedData.churches,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/organizacao:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
