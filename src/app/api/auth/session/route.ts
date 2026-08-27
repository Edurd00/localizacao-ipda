import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { verifySessionToken, getEmailFromSessionToken } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  const authenticated = verifySessionToken(token);
  if (!authenticated) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      isAuthenticated: false,
      role: null,
    });
  }

  const email = getEmailFromSessionToken(token);
  const adminEmail = process.env.ADMIN_EMAIL || 'gestaodedados@ipda.com.br';
  const role = email === adminEmail ? 'admin' : 'viewer';

  return NextResponse.json({
    success: true,
    authenticated: true,
    isAuthenticated: true,
    role,
    email,
  });
}
