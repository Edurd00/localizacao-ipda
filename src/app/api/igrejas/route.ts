import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const [igrejas, states] = await Promise.all([
      getIgrejas({ estado, status }),
      getDistinctStates(),
    ]);

    return NextResponse.json({
      success: true,
      igrejas,
      states,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
