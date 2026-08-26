import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const COLUNAS_ESSENCIAIS = [
  'id',
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
  'dirigente_email',
  'financeira_nome',
  'financeira_telefone',
  'financeira_email',
  'tipo_prebenda',
  'status',
];

const getIgrejasCacheadas = unstable_cache(
  async () => {
    const result = await getIgrejas({ status: 'VALIDADO' }, COLUNAS_ESSENCIAIS);
    console.log(`[API LOG] Total de igrejas retornadas do banco: ${result.length}`);
    return result;
  },
  ['igrejas-validadas-key'],
  { tags: ['igrejas-tag'], revalidate: 86400 }
);

export async function GET() {
  try {
    const dados = await getIgrejasCacheadas();
    return NextResponse.json(dados);
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
