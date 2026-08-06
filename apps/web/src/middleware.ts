import { jwtVerify, type JWTPayload } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — route protection and session management.
 *
 * Runs on the Edge runtime (V8 isolate, not Node.js) before every matched
 * request. Uses `jose` for JWT verification (Edge-compatible; jsonwebtoken
 * is Node.js-only and cannot run here).
 *
 * Flow:
 *   1. Read access_token cookie
 *   2. Verify signature — if valid, attach decoded user to request headers
 *   3. If invalid/expired and on protected route → redirect to /login
 *   4. If valid and on /login → redirect to /dashboard
 *
 * Token refresh:
 *   Middleware does NOT call /auth/refresh directly — that would be a fetch
 *   call inside every Edge request (too slow). Instead it redirects to a
 *   dedicated /auth/session-refresh route which runs the refresh server-side
 *   and then redirects back. The Axios client handles silent refresh for
 *   client-side requests independently.
 *
 * Security note:
 *   JWT_SECRET is a server-only env var (no NEXT_PUBLIC_ prefix).
 *   It is safe to read in middleware (Edge runtime on the server side).
 */

const JWT_SECRET = process.env['JWT_SECRET'];

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/admin'];
const AUTH_PATHS = ['/login', '/auth'];

interface AccessTokenPayload extends JWTPayload {
  sub: string;
  orgId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  if (!JWT_SECRET) {
    console.error('[Middleware] JWT_SECRET is not defined');
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    console.log('[Middleware] JWT verification SUCCESS for user:', payload.sub);
    return payload as AccessTokenPayload;
  } catch (error) {
    console.error(
      '[Middleware] JWT verification FAILED:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  console.log(
    '[Middleware]',
    pathname,
    'Cookie present:',
    !!accessToken,
    'Cookie length:',
    accessToken?.length || 0,
  );

  const user = accessToken ? await verifyAccessToken(accessToken) : null;

  // Authenticated user visiting /login → redirect to dashboard
  if (user && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user visiting a protected route → redirect to /login
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination so post-login redirect works
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pass request through, optionally forwarding user context to Server Components
  const response = NextResponse.next();

  if (user) {
    // Server Components can read these headers to avoid an extra /auth/me call.
    // Header values are strings — complex objects must be JSON-serialized.
    response.headers.set('x-user-id', user.sub);
    response.headers.set('x-org-id', user.orgId);
    response.headers.set('x-user-email', user.email);
    response.headers.set('x-user-roles', user.roles.join(','));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *   - _next/static  (Webpack/Turbopack build artifacts)
     *   - _next/image   (Next.js image optimization)
     *   - favicon.ico
     *   - Static file extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)',
  ],
};
