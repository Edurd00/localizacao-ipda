import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!verifySessionToken(token)) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const totvs = searchParams.get('totvs');

    if (!totvs) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro totvs é obrigatório.' },
        { status: 400 }
      );
    }

    if (pool) {
      const res = await pool.query(
        `SELECT dirigente_nome, dirigente_telefone, dirigente_email, dirigente_data_posse, tipo_prebenda, financeira_nome, financeira_telefone, financeira_email FROM igrejas WHERE codigo_totvs = $1 LIMIT 1`,
        [totvs]
      );

      const data = res.rows[0] || null;
      return NextResponse.json({
        success: true,
        data,
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (err: unknown) {
    console.error('Error in GET /api/igrejas/lideranca:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados de liderança.' },
      { status: 500 }
    );
  }
}
