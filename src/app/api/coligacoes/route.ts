import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET() {
  try {
    const igrejas = await getIgrejas(undefined, [
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
    return NextResponse.json({
      success: true,
      igrejas,
      states,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/coligacoes:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
