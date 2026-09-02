import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { reassignIgrejaChildren, saveIgrejaSingle, registrarHistorico, getIgrejas, Igreja } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const sessionUser = verifySessionToken(token);

  try {
    const body = await request.json();
    const { codigo_totvs, codigo_totvs_pai, desc_igreja, status, porte, reorganizar_filhas_para } = body;

    if (!codigo_totvs) {
      return NextResponse.json(
        { success: false, error: 'O parâmetro codigo_totvs é obrigatório.' },
        { status: 400 }
      );
    }

    // 1. If we need to reorganize daughters
    if (reorganizar_filhas_para) {
      await reassignIgrejaChildren(codigo_totvs, reorganizar_filhas_para);
    }

    // 2. Build the single update object
    const update: Partial<Igreja> = {};
    if (codigo_totvs_pai !== undefined) {
      update.codigo_totvs_pai = codigo_totvs_pai;
    }
    if (desc_igreja !== undefined) {
      update.desc_igreja = desc_igreja;
    }
    if (status !== undefined) {
      update.status = status;
    }
    if (porte !== undefined) {
      update.porte = porte;
    }

    // Fetch existing record to perform Smart Diff
    const currentChurchRes = await getIgrejas({ search: codigo_totvs });
    const currentChurch = currentChurchRes.data.find(
      (item) => item.codigo_totvs === codigo_totvs
    ) || currentChurchRes.data[0];

    const changedFields: Record<string, any> = {};
    if (currentChurch) {
      Object.keys(update).forEach((key) => {
        const newVal = (update as any)[key];
        const oldVal = (currentChurch as any)[key];

        const normNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
        const normOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();

        if (normNew !== normOld) {
          changedFields[key] = newVal;
        }
      });
    } else {
      Object.assign(changedFields, update);
    }

    if (reorganizar_filhas_para) {
      changedFields.reorganizar_filhas_para = reorganizar_filhas_para;
    }

    // 3. Save the main church
    if (Object.keys(update).length > 0) {
      await saveIgrejaSingle(codigo_totvs, update);
    }

    // 4. Record audit log entry only if changes were detected
    if (sessionUser && Object.keys(changedFields).length > 0) {
      await registrarHistorico(
        codigo_totvs,
        sessionUser.nome,
        sessionUser.email,
        'ALTERACAO_COLIGACAO',
        changedFields
      );
    }

    try {
      revalidatePath('/api/coligacoes');
      revalidatePath('/api/igrejas');
      revalidatePath('/api/igrejas/validadas');
      revalidatePath('/api/igrejas/dashboard');
    } catch (revalErr) {
      console.warn('Revalidation failed:', revalErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Igreja atualizada com sucesso.',
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/coligacoes/save:', err);
    const errMsg = err instanceof Error ? err.message : 'Error saving coligacao';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
