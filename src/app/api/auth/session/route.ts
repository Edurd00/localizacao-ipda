import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { verifySessionToken, getEmailFromSessionToken } from '@/lib/auth';

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
    });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    isAuthenticated: true,
    role: sessionData.role,
    email: sessionData.email,
  });
}
