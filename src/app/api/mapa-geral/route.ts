import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const revalidate = 3600; // Cache por 1 hora

export async function GET() {
  try {
    const igrejas = await getIgrejas({ status: 'VALIDADO' });
    return new NextResponse(
      JSON.stringify({
        success: true,
        igrejas,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59',
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
