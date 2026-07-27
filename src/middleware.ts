import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token');

  // Define strictly protected paths
  const protectedPaths = ['/validacao', '/coligacoes', '/dashboard', '/importar'];

  const pathname = request.nextUrl.pathname;

  // Check if current path matches any protected path
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (isProtected) {
    if (!token || token.value !== 'geo-valig-admin-session') {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/validacao/:path*', '/coligacoes/:path*', '/dashboard/:path*', '/importar/:path*'],
};
