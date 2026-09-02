import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const revalidate = 86400;

export async function GET() {
  try {
    const dadosRes = await getIgrejas({ status: 'VALIDADO' }, [
      'codigo_totvs',
      'desc_igreja',
      'latitude',
      'longitude',
      'estado',
      'municipio',
      'bairro',
      'endereco',
      'cep',
      'porte',
      'codigo_totvs_pai',
      'tipo_imovel',
      'qtd_membros',
      'qtd_jovens',
      'dirigente_nome',
      'dirigente_data_posse',
      'dirigente_telefone',
      'financeira_nome',
      'financeira_telefone',
      'tipo_prebenda',
    ]);

    const data = dadosRes.data.map((igreja: any) => ({
      ...igreja,
      dirigente_nome: null,
      dirigente_telefone: null,
      dirigente_email: null,
      financeira_nome: null,
      financeira_telefone: null,
      financeira_email: null,
      tipo_prebenda: null,
    }));

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
      },
    });
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
