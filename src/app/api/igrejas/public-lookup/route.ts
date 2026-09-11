import { NextRequest, NextResponse } from 'next/server';
import { obterIgrejaMinima, verificarSubmissaoAnual } from '@/lib/patrimonio';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const totvs = (searchParams.get('totvs') || '').trim();

    if (!totvs) {
      return NextResponse.json(
        { success: false, message: 'Código TOTVS não encontrado.' },
        { status: 404 }
      );
    }

    const igreja = await obterIgrejaMinima(totvs);

    if (!igreja) {
      return NextResponse.json(
        { success: false, message: 'Código TOTVS não encontrado.' },
        { status: 404 }
      );
    }

    const anoAtual = new Date().getFullYear();
    const jaEnviado = await verificarSubmissaoAnual(igreja.codigo_totvs, anoAtual);

    if (jaEnviado) {
      return NextResponse.json(
        {
          success: false,
          ja_enviado: true,
          mensagem: `Declaração de ${anoAtual} já realizada para este TOTVS.`,
          igreja: {
            codigo_totvs: igreja.codigo_totvs,
            desc_igreja: igreja.desc_igreja,
            endereco: igreja.endereco,
            bairro: igreja.bairro,
            municipio: igreja.municipio,
            estado: igreja.estado,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      igreja: {
        codigo_totvs: igreja.codigo_totvs,
        desc_igreja: igreja.desc_igreja,
        endereco: igreja.endereco,
        bairro: igreja.bairro,
        municipio: igreja.municipio,
        estado: igreja.estado,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/igrejas/public-lookup:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao consultar igreja.' },
      { status: 500 }
    );
  }
}
