import { NextResponse } from 'next/server';

export const revalidate = 86400;
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET() {
  try {
    const igrejasRes = await getIgrejas(undefined, [
      'id',
      'codigo_totvs',
      'codigo_totvs_pai',
      'desc_igreja',
      'porte',
      'status',
      'municipio',
      'estado'
    ]);
    const states = await getDistinctStates();
    return new NextResponse(
      JSON.stringify({
        success: true,
        igrejas: igrejasRes.data,
        states,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/coligacoes:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
