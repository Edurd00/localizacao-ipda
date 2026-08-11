import { NextResponse } from 'next/server';

import { generateSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL || 'gestaodedados@ipda.com.br';
    const expectedPassword = process.env.ADMIN_PASSWORD_HASH || '@admgd2026';

    if (email === expectedEmail && password === expectedPassword) {
      const response = NextResponse.json({
        success: true,
        message: 'Autenticação realizada com sucesso!',
      });

      const secureToken = generateSessionToken(email);

      // Set cookie for session token
      response.cookies.set('session_token', secureToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}
