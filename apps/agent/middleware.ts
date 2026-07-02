import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@sigil/shared';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * In-memory token bucket rate limiter for API routes.
 * 60 requests per minute per IP address.
 *
 * Rate-limited routes: all /api/* routes
 * Excluded: /api/health (Render health checks)
 */
const buckets = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 60; // 60 requests
const REFILL_RATE = 60_000; // per minute
const REFILL_INTERVAL = 1_000; // refill 1 token per second

function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  lazyCleanup();
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / REFILL_INTERVAL);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, remaining: bucket.tokens };
  }

  return { allowed: false, remaining: 0 };
}

// Lazy cleanup: prune stale entries on each rate-limit check.
// Avoids setInterval which leaks memory on serverless (Render).
let _lastCleanup = Date.now();
function lazyCleanup() {
  const now = Date.now();
  if (now - _lastCleanup < 5 * 60_000) return;
  _lastCleanup = now;
  const cutoff = now - 15 * 60_000;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}

/**
 * Verify the session JWT from the httpOnly cookie.
 * Returns the payload if valid, null otherwise.
 */
async function verifyAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'signet-demo-secret-rotate-in-production-2026',
    );
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

function isPublicApiRoute(pathname: string): boolean {
  // Auth endpoints manage their own session
  if (pathname.startsWith('/api/auth/')) return true;
  // Health check — Render deploy verification
  if (pathname === '/api/health') return true;
  // Feedback — intentionally open (honeypot + rate limited)
  if (pathname === '/api/feedback') return true;
  // Meeting room — public demo (join code protects access)
  if (pathname.startsWith('/api/meeting')) return true;
  // x402 service info — Circle Marketplace scrapes this for agent listing
  if (pathname === '/api/x402/service-info') return true;
  // x402 analyze and knowledge — Circle Gateway calls these with X-Payment-Id
  if (pathname === '/api/x402/analyze') return true;
  if (pathname === '/api/x402/knowledge') return true;
  // Agent status — public agent metadata (like service-info)
  if (pathname === '/api/agent/status') return true;
  // Agent knowledge — free-tier public endpoint
  if (pathname === '/api/agent/knowledge') return true;
  return false;
}

function isStateChanging(method: string): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
}

function validateCSRF(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) return false;
  // Constant-time comparison
  if (cookieToken.length !== headerToken.length) return false;
  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return result === 0;
}

function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_PRODUCTION_URL,
    'https://signet.ventures',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  if (origin && allowedOrigins.some((ao) => origin.startsWith(ao))) {
    return origin;
  }
  return allowedOrigins[0] || 'https://signet.ventures';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Health check — always pass, no rate limiting
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Rate limit all API routes
  const key = getRateLimitKey(request);
  const { allowed, remaining } = checkRateLimit(key);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_TOKENS),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // Auth check for protected API routes
  if (!isPublicApiRoute(pathname)) {
    const authenticated = await verifyAuth(request);
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 },
      );
    }

    // CSRF validation on state-changing routes
    if (isStateChanging(request.method)) {
      if (!validateCSRF(request)) {
        return NextResponse.json(
          { error: 'Invalid or missing CSRF token. Please refresh and try again.' },
          { status: 403 },
        );
      }
    }
  }

  // Pass through with rate limit headers and CORS
  const origin = getCorsOrigin(request);
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(MAX_TOKENS));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    `Content-Type, Authorization, ${CSRF_HEADER_NAME}`,
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
