import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    const states = await getDistinctStates();
    const allChurchesRes = await getIgrejas();
    const churches = allChurchesRes.data.filter((ig) => ig.status !== 'DESATIVADO');

    if (!estado) {
      return NextResponse.json({
        success: true,
        states: states.filter(Boolean),
      });
    }

    return NextResponse.json({
      success: true,
      churches,
    });
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      throw err;
    }
    console.error('API Error in GET /api/organizacao:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
