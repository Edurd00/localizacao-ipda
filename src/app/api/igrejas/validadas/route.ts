import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

// DESATIVA QUALQUER CACHE ESTÁTICO DE BUILD DA VERCEL
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getIgrejas({ status: 'VALIDADO' });

    console.log(`[API LOG] Total de igrejas retornadas do banco: ${result.length}`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
