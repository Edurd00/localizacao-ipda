import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';
import { unstable_cache } from 'next/cache';

const getIgrejasCacheadas = unstable_cache(
  async () => {
    const result = await getIgrejas({ status: 'VALIDADO' });
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
