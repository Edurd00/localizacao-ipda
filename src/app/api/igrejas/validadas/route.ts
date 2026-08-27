import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const revalidate = 86400;

export async function GET() {
  try {
    const dados = await getIgrejas({ status: 'VALIDADO' }, [
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
    return NextResponse.json(dados);
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
