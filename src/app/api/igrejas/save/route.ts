export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { saveIgrejaSingle } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo_totvs, latitude, longitude, status, usuario_validador, link_google_maps } = body;

    if (!codigo_totvs) {
      return NextResponse.json(
        { success: false, error: 'Field "codigo_totvs" is required.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
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

    await saveIgrejaSingle(codigo_totvs, updates);

    // On-demand revalidation
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/mapa-geral');

    return NextResponse.json({
      success: true,
      message: `Church ${codigo_totvs} updated successfully.`,
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
