import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET() {
  try {
    const igrejas = await getIgrejas();
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
