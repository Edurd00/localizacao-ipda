import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');

  const authenticated = verifySessionToken(token?.value);

  return NextResponse.json({
    success: true,
    authenticated,
  });
}
