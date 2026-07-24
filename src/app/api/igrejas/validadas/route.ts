import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export async function GET() {
  try {
    const igrejas = await getIgrejas({ status: 'VALIDADO' });
    return NextResponse.json({
      success: true,
      igrejas,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/validadas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
