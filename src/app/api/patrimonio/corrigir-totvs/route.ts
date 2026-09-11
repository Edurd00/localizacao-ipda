import { NextRequest, NextResponse } from 'next/server';
import { corrigirTotvsPatrimonio } from '@/lib/patrimonio';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken || !verifySessionToken(sessionToken)) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login para continuar.' },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido (JSON esperado).' },
        { status: 400 }
      );
    }

    const { submissao_id, novo_codigo_totvs } = body || {};

    if (!submissao_id) {
      return NextResponse.json(
        { success: false, error: 'O identificador da submissão (submissao_id) é obrigatório.' },
        { status: 400 }
      );
    }

    const cleanTotvs = String(novo_codigo_totvs || '').trim();
    if (!cleanTotvs) {
      return NextResponse.json(
        { success: false, error: 'O novo código TOTVS é obrigatório.' },
        { status: 400 }
      );
    }

    const resultado = await corrigirTotvsPatrimonio(submissao_id, cleanTotvs);

    try {
      revalidatePath('/gestao-patrimonio');
      revalidatePath('/api/patrimonio/lista');
      revalidatePath(`/api/patrimonio/${cleanTotvs}`);
    } catch (revalErr) {
      console.warn('Revalidation warning:', revalErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: resultado.message,
        data: {
          submissao_id,
          novo_codigo_totvs: cleanTotvs,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error in PATCH /api/patrimonio/corrigir-totvs:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro interno ao corrigir Código TOTVS da submissão.',
      },
      { status: 400 }
    );
  }
}
