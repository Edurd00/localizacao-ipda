import { NextRequest, NextResponse } from 'next/server';
import { obterEstatisticasPatrimonio } from '@/lib/patrimonio';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regiao = searchParams.get('regiao') || undefined;
    const estado = searchParams.get('estado') || undefined;
    const sede = searchParams.get('sede') || undefined;
    const porte = searchParams.get('porte') || undefined;
    const estadoItem = searchParams.get('estadoItem') || searchParams.get('estado_conservacao') || undefined;

    const result = await obterEstatisticasPatrimonio({
      regiao,
      estado,
      sede,
      porte,
      estadoItem: estadoItem || (searchParams.get('estado') === 'RUIM' ? 'RUIM' : undefined),
    });

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
