import { NextResponse } from 'next/server';
import path from 'path';
import { parseExcelRows, processPrebendaUpdates } from '../../../../scripts/import-prebendas-membros';

export async function POST() {
  try {
    const excelPath = path.join(process.cwd(), 'prebendados e voluntarios.xlsx');
    const records = parseExcelRows(excelPath);
    const result = await processPrebendaUpdates(records);

    return NextResponse.json({
      success: true,
      message: `Carga concluída com sucesso! ${result.updatedCount} igrejas atualizadas.`,
      result,
    });
  } catch (error: unknown) {
    console.error('Error in /api/admin/import-prebendas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar carga de prebendas e membros.';
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
