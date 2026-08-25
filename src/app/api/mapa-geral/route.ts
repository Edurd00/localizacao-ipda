import { NextResponse } from 'next/server';
import { getIgrejasForMap } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const igrejas = await getIgrejasForMap();
    return new NextResponse(
      JSON.stringify({
        success: true,
        igrejas,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/mapa-geral:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
