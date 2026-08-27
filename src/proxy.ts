import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifySessionToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token');

  // Define strictly protected paths
  const protectedPaths = ['/validacao', '/coligacoes', '/dashboard', '/importar', '/relatorios', '/gestao'];

  const pathname = request.nextUrl.pathname;

  // Check if current path matches any protected path
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (isProtected) {
    const sessionData = verifySessionToken(token?.value);
    if (!sessionData) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (sessionData.role === 'viewer') {
      const mapaUrl = new URL('/mapa-geral', request.url);
      return NextResponse.redirect(mapaUrl);
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/validacao/:path*',
    '/coligacoes/:path*',
    '/dashboard/:path*',
    '/importar/:path*',
    '/relatorios/:path*',
    '/gestao/:path*',
  ],
};
