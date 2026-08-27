import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { generateSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD_HASH;
    const viewerPassword = process.env.VIEWER_PASSWORD_HASH;

    if (!adminPassword && !viewerPassword) {
      return NextResponse.json(
        { success: false, error: 'Servidor não configurado. Variáveis de senha ausentes.' },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();

    const expectedAdminEmail = process.env.ADMIN_EMAIL || 'gestaodedados@ipda.com.br';
    const expectedViewerEmail = process.env.VIEWER_EMAIL || 'viewer@ipda.com.br';

    let authenticatedEmail: string | null = null;
    let userRole: 'admin' | 'viewer' = 'viewer';

    if (adminPassword && email === expectedAdminEmail && password === adminPassword) {
      authenticatedEmail = expectedAdminEmail;
      userRole = 'admin';
    } else if (viewerPassword && email === expectedViewerEmail && password === viewerPassword) {
      authenticatedEmail = expectedViewerEmail;
      userRole = 'viewer';
    }

    if (authenticatedEmail) {
      const response = NextResponse.json({
        success: true,
        message: 'Autenticação realizada com sucesso!',
      });

      const secureToken = generateSessionToken(authenticatedEmail, userRole);

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
