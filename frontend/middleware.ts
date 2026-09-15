import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/register', '/api/health'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  // Role is mirrored into a cookie by setAuth(): the edge runtime can read
  // cookies but not localStorage, so this is how /login knows where to send an
  // already-signed-in admin. It is a routing hint only — the API re-checks
  // `is_admin` on every admin request, so a tampered cookie grants nothing.
  const isAdmin = request.cookies.get('role')?.value === 'admin';
  const path = request.nextUrl.pathname;

  const isPublic = publicRoutes.some(route => path === route || path.startsWith('/s/'));
  const isAuth = authRoutes.some(route => path === route);

  // `/admin` is protected here too, but the real gate is the API's `admin`
  // middleware — the client-side check in app/admin/layout.tsx is only UX.
  if (!token && !isPublic && !path.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuth) {
    return NextResponse.redirect(
      new URL(isAdmin ? '/admin' : '/dashboard', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|html|txt|xml)$).*)',
  ],
};