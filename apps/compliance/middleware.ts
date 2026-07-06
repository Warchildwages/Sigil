/**
 * Companion App — Middleware
 *
 * Rate limiting + CORS for all /api/* routes.
 * Mirrors Luna/Vera middleware pattern.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const buckets = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 60;
const REFILL_INTERVAL = 1_000;

function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  if (pathname === '/api/health') {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, PAYMENT-SIGNATURE, X-Idempotency-Key, x-402-amount, x-402-payment-intent, x-402-token, x-402-recipient, x-402-idempotency-key, x-402-expires-at');
    return response;
  }

  const key = getRateLimitKey(request);
  const { allowed, remaining } = checkRateLimit(key);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Limit': String(MAX_TOKENS), 'X-RateLimit-Remaining': '0' } },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(MAX_TOKENS));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, PAYMENT-SIGNATURE, X-Idempotency-Key, x-402-amount, x-402-payment-intent, x-402-token, x-402-recipient, x-402-idempotency-key, x-402-expires-at');
  return response;
}

export const config = { matcher: '/api/:path*' };
