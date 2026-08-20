import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    if (!estado) {
      // Return lightweight list of distinct states/UFs
      const states = await getDistinctStates();
      return new NextResponse(
        JSON.stringify({
          success: true,
          states: states.filter(Boolean),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'public, s-maxage=86400',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
          },
        }
      );
    }

    // Return ALL active churches for hierarchical tree structure matching
    // (excluding DESATIVADO) to support divisa/cross-state hierarchy.
    // When estado is 'ALL' or a specific jurisdiction region, we return all churches to map cross-border links.
    const allChurches = await getIgrejas();
    const churches = allChurches.filter((ig) => ig.status !== 'DESATIVADO');

    return new NextResponse(
      JSON.stringify({
        success: true,
        churches,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, s-maxage=86400',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/organizacao:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
