import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { corrigirTotvsPatrimonio } from '@/lib/patrimonio';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');
  return verifySessionToken(token?.value);
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login novamente.' },
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
        { success: false, error: 'O ID da submissão é obrigatório.' },
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

    const res = await corrigirTotvsPatrimonio(submissao_id, cleanTotvs);

    try {
      revalidatePath('/gestao-patrimonio');
      revalidatePath(`/patrimonio/${cleanTotvs}`);
      revalidatePath(`/api/patrimonio/${cleanTotvs}`);
      revalidatePath('/api/patrimonio/lista');
    } catch (revalErr) {
      console.warn('Revalidation warning:', revalErr);
    }

    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    console.error('Error in PATCH /api/patrimonio/corrigir-totvs:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao corrigir código TOTVS.' },
      { status: 400 }
    );
  }
}
