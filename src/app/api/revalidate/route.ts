import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path') || '/api/mapa-geral';

    // Trigger on-demand revalidation
    revalidatePath(path);
    // Also revalidate main pages and validadas endpoint for good measure
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/api/igrejas/validadas');

    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
      message: `Revalidação sob demanda concluída para o caminho: ${path}`
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

    // Trigger on-demand revalidation
    revalidatePath(path);
    // Also revalidate main pages and validadas endpoint for good measure
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/api/igrejas/validadas');

    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
      message: `Revalidação sob demanda concluída para o caminho: ${path}`
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
