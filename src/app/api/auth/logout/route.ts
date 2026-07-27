import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });

  // Clear cookie
  response.cookies.delete('session_token');

  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.delete('session_token');
  return response;
}
