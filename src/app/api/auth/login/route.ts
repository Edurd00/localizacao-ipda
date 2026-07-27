import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL || 'admin@ipda.com.br';
    const expectedPassword = process.env.ADMIN_PASSWORD_HASH || 'admin123';

    if (email === expectedEmail && password === expectedPassword) {
      const response = NextResponse.json({
        success: true,
        message: 'Autenticação realizada com sucesso!',
      });

      // Set cookie for session token
      response.cookies.set('session_token', 'geo-valig-admin-session', {
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
