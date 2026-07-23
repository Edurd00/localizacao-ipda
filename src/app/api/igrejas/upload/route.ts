import { NextResponse } from 'next/server';
import { saveIgrejasBulk, Igreja } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const igrejas = body.igrejas as Igreja[];

    if (!Array.isArray(igrejas)) {
      return NextResponse.json(
        { success: false, error: 'Expected an array of churches in the "igrejas" key.' },
        { status: 400 }
      );
    }

    if (igrejas.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No churches to import.',
      });
    }

    await saveIgrejasBulk(igrejas);

    return NextResponse.json({
      success: true,
      count: igrejas.length,
      message: `${igrejas.length} churches imported/updated successfully.`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/upload:', err);
    const errMsg = err instanceof Error ? err.message : 'Error importing churches';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
