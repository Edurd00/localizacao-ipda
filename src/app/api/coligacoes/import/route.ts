import { NextResponse } from 'next/server';
import { saveIgrejasBulk, Igreja } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { igrejas } = body;

    if (!Array.isArray(igrejas)) {
      return NextResponse.json(
        { success: false, error: 'Expected an array of churches in "igrejas".' },
        { status: 400 }
      );
    }

    if (igrejas.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Nenhuma igreja enviada no lote.',
      });
    }

    // Process/save the bulk chunk
    await saveIgrejasBulk(igrejas);

    return NextResponse.json({
      success: true,
      count: igrejas.length,
      message: `${igrejas.length} igrejas importadas no lote atual com sucesso.`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/coligacoes/import:', err);
    const errMsg = err instanceof Error ? err.message : 'Error importing chunk';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
