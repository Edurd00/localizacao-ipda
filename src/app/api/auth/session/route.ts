import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  const sessionData = verifySessionToken(token);
  if (!sessionData) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      isAuthenticated: false,
      role: null,
      nome: null,
      email: null,
    });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    isAuthenticated: true,
    role: sessionData.role,
    nome: sessionData.nome,
    email: sessionData.email,
  });
}
