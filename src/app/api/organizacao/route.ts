import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    // Return churches for specified state/UF (excluding DESATIVADO)
    const allChurches = await getIgrejas({ estado });
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
