import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getIgrejas, saveIgrejaSingle, Igreja } from '@/lib/db';

export async function POST(request: Request) {
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
      const allIgrejas = await getIgrejas();
      const daughters = allIgrejas.filter(
        (ig) => ig.codigo_totvs_pai === codigo_totvs
      );

      for (const daughter of daughters) {
        await saveIgrejaSingle(daughter.codigo_totvs, {
          codigo_totvs_pai: reorganizar_filhas_para,
        });
      }
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

    // 3. Save the main church
    if (Object.keys(update).length > 0) {
      await saveIgrejaSingle(codigo_totvs, update);
    }

    try {
      revalidatePath('/api/igrejas/dashboard');
    } catch (revalErr) {
      console.warn('Dashboard revalidation failed:', revalErr);
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
