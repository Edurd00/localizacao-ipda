import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path') || '/api/mapa-geral';

    // Trigger on-demand revalidation on all public paths to guarantee immediate real-time updates
    revalidatePath(path);
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/organizacao');
    revalidatePath('/api/mapa-geral');
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');

    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
      message: `Revalidação sob demanda concluída para todos os caminhos públicos.`
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/revalidate:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = body.path || '/api/mapa-geral';

    // Trigger on-demand revalidation on all public paths to guarantee immediate real-time updates
    revalidatePath(path);
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/organizacao');
    revalidatePath('/api/mapa-geral');
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');

    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
      message: `Revalidação sob demanda concluída para todos os caminhos públicos.`
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/revalidate:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
