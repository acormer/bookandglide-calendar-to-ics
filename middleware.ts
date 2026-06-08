import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/calendar.ics',
  '/api/meteo.ics',
  '/login',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie =
    req.cookies.get('better-auth.session_token') ??
    req.cookies.get('__Secure-better-auth.session_token');

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
