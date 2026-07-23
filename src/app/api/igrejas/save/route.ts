import { NextResponse } from 'next/server';
import { saveIgrejaSingle } from '@/lib/db';

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

    await saveIgrejaSingle(codigo_totvs, updates);

    return NextResponse.json({
      success: true,
      message: `Church ${codigo_totvs} updated successfully.`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/save:', err);
    const errMsg = err instanceof Error ? err.message : 'Error updating church.';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
