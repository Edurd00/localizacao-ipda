import { NextRequest, NextResponse } from 'next/server';
import { obterEstatisticasPatrimonio } from '@/lib/patrimonio';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;

    const result = await obterEstatisticasPatrimonio(estado);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro em GET /api/patrimonio/dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao carregar estatísticas do patrimônio',
      },
      { status: 500 }
    );
  }
}
