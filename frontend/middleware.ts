import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/register', '/api/health'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  const isPublic = publicRoutes.some(route => path === route || path.startsWith('/s/'));
  const isAuth = authRoutes.some(route => path === route);

  if (!token && !isPublic && !path.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json)$).*)'],
};