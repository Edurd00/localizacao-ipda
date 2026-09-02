import { NextResponse } from 'next/server';
import { generateSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TEAM_MEMBERS: Record<string, { nome: string; role: string }> = {
  'admin@geomanager.com': { nome: 'Gestor de Dados', role: 'admin' },
  'viewer@geomanager.com': { nome: 'Usuário de Leitura', role: 'viewer' },
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if member exists in TEAM_MEMBERS
    const memberKey = Object.keys(TEAM_MEMBERS).find(
      (key) => key.toLowerCase() === normalizedEmail
    );

    if (!memberKey) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const member = TEAM_MEMBERS[memberKey];

    // Password validation adapted for portfolio direct password checks
    let isValidPassword = false;
    const lowerKey = memberKey.toLowerCase();

    if (lowerKey === 'admin@geomanager.com') {
      isValidPassword = password === 'admin123' || password === process.env.ADMIN_PASSWORD_HASH;
    } else if (lowerKey === 'viewer@geomanager.com') {
      isValidPassword = password === 'viewer123' || password === process.env.VIEWER_PASSWORD_HASH;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Autenticação realizada com sucesso!',
    });

    const secureToken = generateSessionToken(memberKey, member.role, member.nome);

    response.cookies.set('session_token', secureToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}
