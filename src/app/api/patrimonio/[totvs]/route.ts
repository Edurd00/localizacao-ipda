import { NextRequest, NextResponse } from 'next/server';
import { obterIgrejaPorTotvs, obterPatrimonioCompleto } from '@/lib/patrimonio';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ totvs: string }> | { totvs: string } }
) {
  try {
    const resolvedParams = await params;
    const totvs = resolvedParams?.totvs;

    if (!totvs) {
      return NextResponse.json(
        { success: false, data: null, igreja: null, error: 'Código TOTVS não fornecido.' },
        { status: 400 }
      );
    }

    const [igreja, patrimonio] = await Promise.all([
      obterIgrejaPorTotvs(totvs),
      obterPatrimonioCompleto(totvs),
    ]);

    if (!igreja) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          igreja: null,
          error: `Igreja com código TOTVS "${totvs}" não foi encontrada.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: patrimonio || null,
      igreja,
    });
  } catch (err: any) {
    console.error('Error in GET /api/patrimonio/[totvs]:', err);
    return NextResponse.json(
      { success: false, data: null, igreja: null, error: err.message || 'Erro interno ao consultar patrimônio.' },
      { status: 500 }
    );
  }
}
