import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { getHistoricoIgreja } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const totvs = searchParams.get('totvs');

    if (!totvs) {
      return NextResponse.json(
        { success: false, error: 'Código TOTVS é obrigatório' },
        { status: 400 }
      );
    }

    const history = await getHistoricoIgreja(totvs);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/historico:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao buscar histórico';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
