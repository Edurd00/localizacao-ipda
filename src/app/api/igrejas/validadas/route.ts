import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIgrejas } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export const revalidate = 86400;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = verifySessionToken(cookieStore.get('session_token')?.value);

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

    let data = dadosRes.data;
    if (!isAuthenticated) {
      data = data.map((igreja: any) => ({
        ...igreja,
        dirigente_nome: null,
        dirigente_telefone: null,
        dirigente_email: null,
        financeira_nome: null,
        financeira_telefone: null,
        financeira_email: null,
        tipo_prebenda: null,
      }));
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
