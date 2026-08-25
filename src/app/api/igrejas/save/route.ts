export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saveIgrejaSingle } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, codigo_totvs, latitude, longitude, status, usuario_validador, link_google_maps, ...restData } = body;

    if (!id && !codigo_totvs) {
      return NextResponse.json(
        { success: false, error: 'ID ou codigo_totvs é obrigatório.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { ...restData };
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (status !== undefined) updates.status = status;
    if (usuario_validador !== undefined) updates.usuario_validador = usuario_validador;
    if (link_google_maps !== undefined) updates.link_google_maps = link_google_maps;

    if (status === 'VALIDADO') {
      if (usuario_validador !== undefined) {
        updates.validado_por = usuario_validador;
      }
      updates.validado_em = new Date().toISOString();
    }

    const savedChurch = await saveIgrejaSingle({ id, codigo_totvs }, updates);

    // Trigger revalidation for dashboard route and public map cache
    try {
      revalidatePath('/api/igrejas/dashboard');
      revalidatePath('/api/igrejas/validadas');
    } catch (revalErr) {
      console.warn('Revalidation failed (non-fatal):', revalErr);
    }

    return NextResponse.json({
      success: true,
      data: savedChurch,
      message: `Church ${codigo_totvs || id} updated successfully.`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/save:', err);
    const errMsg = err instanceof Error ? err.message : 'Error updating church.';
    return NextResponse.json(
      { success: false, error: errMsg, error_message: errMsg },
      { status: 500 }
    );
  }
}
