import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';
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

const getOrganizacaoDataCacheada = unstable_cache(
  async () => {
    const states = await getDistinctStates();
    const allChurches = await getIgrejas(undefined, COLUNAS_ESSENCIAIS);
    const churches = allChurches.filter((ig) => ig.status !== 'DESATIVADO');
    return {
      states: states.filter(Boolean),
      churches,
    };
  },
  ['organizacao-data-key'],
  { tags: ['organizacao-tag'], revalidate: 86400 }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    const cachedData = await getOrganizacaoDataCacheada();

    if (!estado) {
      return NextResponse.json({
        success: true,
        states: cachedData.states,
      });
    }

    return NextResponse.json({
      success: true,
      churches: cachedData.churches,
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/organizacao:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
