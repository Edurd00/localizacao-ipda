import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { saveIgrejasBulk, Igreja } from '@/lib/db';
import { parseWorkbook } from '@/lib/parser';
import * as XLSX from 'xlsx';

export const maxDuration = 60; // Increase server timeout on compatible hosts (like Vercel Pro)
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let parsedChurches: Igreja[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Check if it's base64 spreadsheet import
      if (body.fileData && typeof body.fileData === 'string') {
        const fileBuffer = Buffer.from(body.fileData, 'base64');
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        parsedChurches = parseWorkbook(workbook);
      } else if (Array.isArray(body.igrejas)) {
        parsedChurches = body.igrejas;
      } else {
        return NextResponse.json(
          { success: false, error: 'Expected an array of churches in "igrejas" or base64 fileData.' },
          { status: 400 }
        );
      }
    } else {
      // Standard multipart form data parse
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      parsedChurches = parseWorkbook(workbook);
    }

    if (parsedChurches.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Nenhuma igreja válida foi encontrada ou processada na planilha.',
      });
    }

    const report = await saveIgrejasBulk(parsedChurches);

    // Revalidate relevant cache paths on-demand for spreadsheet imports
    revalidatePath('/');
    revalidatePath('/mapa-geral');
    revalidatePath('/api/mapa-geral');
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/igrejas/dashboard');

    return NextResponse.json({
      success: true,
      count: parsedChurches.length,
      report,
      message: `${parsedChurches.length} igrejas processadas com sucesso. Relatório: ${report.novas} novas, ${report.atualizadas} atualizadas, ${report.preservadas} preservadas (protegidas contra alteração).`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/upload:', err);
    const errMsg = err instanceof Error ? err.message : 'Error importing churches';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
