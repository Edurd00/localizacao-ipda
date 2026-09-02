import { NextResponse } from 'next/server';
import { generateSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TEAM_MEMBERS: Record<string, { nome: string; role: string }> = {
  'gestaodedados@ipda.com.br': { nome: 'Caio Rodrigues', role: 'admin' },
  'gestaodedados.nordeste@ipda.com.br': { nome: 'Luiz Eduardo', role: 'admin' },
  'gestaodedados.sudestesp@ipda.com.br': { nome: 'Christian Azevedo', role: 'admin' },
  'gestaodedados.norte@ipda.com.br': { nome: 'Guilherme Almeida', role: 'admin' },
  'gestaodedados.centrooeste@ipda.com.br': { nome: 'Flaviane Marvilla', role: 'admin' },
  'gestaodedados.sudestemg@ipda.com.br': { nome: 'Fernanda Brito', role: 'admin' },
  'gestaodedados.sul@ipda.com.br': { nome: 'Mayara Ruany', role: 'admin' },
  // Mantém o viewer genérico que criamos anteriormente
  [process.env.VIEWER_EMAIL || 'leitura@ipda.com.br']: { nome: 'Usuário de Leitura', role: 'viewer' }
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

    // Determine expected password hash based on email / role rules
    let expectedPasswordHash: string | undefined;

    if (memberKey.toLowerCase() === 'gestaodedados@ipda.com.br') {
      expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    } else if (member.role === 'admin') {
      expectedPasswordHash = process.env.REGIONAL_PASSWORD_HASH;
    } else {
      expectedPasswordHash = process.env.VIEWER_PASSWORD_HASH;
    }

    if (!expectedPasswordHash) {
      return NextResponse.json(
        { success: false, error: 'Servidor não configurado. Variável de senha ausente.' },
        { status: 500 }
      );
    }

    if (password !== expectedPasswordHash) {
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
