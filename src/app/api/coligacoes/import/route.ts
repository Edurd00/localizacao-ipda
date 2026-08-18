import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saveIgrejasBulk, Igreja } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { igrejas } = body;

    if (!Array.isArray(igrejas)) {
      return NextResponse.json(
        { success: false, error: 'Expected an array of churches in "igrejas".' },
        { status: 400 }
      );
    }

    if (igrejas.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Nenhuma igreja enviada no lote.',
      });
    }

    // Process/save the bulk chunk
    const report = await saveIgrejasBulk(igrejas, { isReclassificacao: true });

    // Revalidate relevant cache paths on-demand
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/api/mapa-geral');
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/igrejas/dashboard');

    return NextResponse.json({
      success: true,
      count: igrejas.length,
      report,
      message: `${igrejas.length} igrejas processadas no lote atual com sucesso. Relatório: ${report.novas} novas, ${report.atualizadas} atualizadas, ${report.preservadas} preservadas (protegidas).`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/coligacoes/import:', err);
    const errMsg = err instanceof Error ? err.message : 'Error importing chunk';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
