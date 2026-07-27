import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');

  const authenticated = token?.value === 'geo-valig-admin-session';

  return NextResponse.json({
    success: true,
    authenticated,
  });
}
