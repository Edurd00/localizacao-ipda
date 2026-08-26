import { NextResponse } from 'next/server';
import { getIgrejas } from '@/lib/db';

export const revalidate = 86400; // 24 horas ISR

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefresh = searchParams.get('refresh') === 'true';

    const result = await getIgrejas({ status: 'VALIDADO' });

    console.log(`[API LOG] Total de igrejas retornadas do banco: ${result.length}`);

    if (isRefresh) {
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Erro na API:', error);
    return NextResponse.json([], { status: 500 });
  }
}
