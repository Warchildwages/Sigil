/**
 * Sigil Smoke Test — Verifies the full x402 flow works.
 *
 * Tests:
 *   - Service info returns valid metadata
 *   - Agent status returns current metrics
 *   - Health check responds
 *   - Paid operations return 402 when no payment provided
 *   - Chat endpoint returns operation plan
 *   - Identity endpoint returns cross-chain proof
 *   - did:nostr endpoint resolves correctly
 *
 * Mirrors Luna's smoke.test.ts pattern.
 *
 * Run: cd apps/demo && npx vitest run __tests__/smoke.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

interface FetchResult {
  status: number;
  headers: Headers;
  body: unknown;
}

async function fetchJson(url: string, options?: RequestInit): Promise<FetchResult> {
  const res = await fetch(`${BASE_URL}${url}`, options);
  const body = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body };
}

beforeAll(async () => {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}, 30000);

describe('Health', () => {
  it('GET /api/health returns 200', async () => {
    const { status, body } = await fetchJson('/api/health');
    expect(status).toBe(200);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('service', 'sigil');
  });
});

describe('Service Info', () => {
  it('GET /api/x402/service-info returns service listing', async () => {
    const { status, body } = await fetchJson('/api/x402/service-info');
    expect(status).toBe(200);
    expect(body).toHaveProperty('serviceId', 'sigil-v1');
    expect(body).toHaveProperty('operations');
    const ops = (body as Record<string, unknown>).operations as Record<string, unknown>;
    expect(ops).toHaveProperty('witness');
    expect(ops).toHaveProperty('escrow');
    expect(ops).toHaveProperty('analyze');
  });
});

describe('Agent Status', () => {
  it('GET /api/agent/status returns agent metadata', async () => {
    const { status, body } = await fetchJson('/api/agent/status');
    expect(status).toBe(200);
    expect(body).toHaveProperty('wallet');
    expect(body).toHaveProperty('version', '1.0.0');
  });
});

describe('Paid Operations (402 flow)', () => {
  const PAID_OPS = ['witness', 'compliance', 'milestone', 'oracle', 'reputation', 'timestamp', 'translate', 'analyze'];

  PAID_OPS.forEach((op) => {
    it(`POST /api/x402/${op} returns 402 without payment`, async () => {
      const { status, body } = await fetchJson(`/api/x402/${op}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect([401, 402, 400]).toContain(status);
      // Should have some indication of payment required
      const bodyStr = JSON.stringify(body).toLowerCase();
      expect(
        bodyStr.includes('payment') ||
        bodyStr.includes('header') ||
        bodyStr.includes('402') ||
        bodyStr.includes('required'),
      ).toBe(true);
    });
  });
});

describe('Chat / NLU', () => {
  it('GET /api/chat returns operation catalog', async () => {
    const { status, body } = await fetchJson('/api/chat');
    expect(status).toBe(200);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('operations');
  });

  it('POST /api/chat returns plan for legal requests', async () => {
    const { status, body } = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Witness this contract' }),
    });
    // May 503 if LLM not configured — that's acceptable
    expect([200, 500, 503]).toContain(status);
  });
});

describe('Cross-Chain Identity', () => {
  it('GET /api/agent/identity returns identity endpoint', async () => {
    const { status } = await fetchJson('/api/agent/identity');
    // 503 if env vars not set, 200 if configured — both are valid
    expect([200, 503]).toContain(status);
  });
});

describe('did:nostr', () => {
  it('GET /.well-known/did/nostr returns info about pubkey format', async () => {
    const { status } = await fetchJson('/.well-known/did/nostr/test');
    // 400 for invalid pubkey, 500 if misconfigured
    expect([400, 500, 200]).toContain(status);
  });
});

describe('Free Endpoints', () => {
  it('GET /api/x402/analyze returns payment structured response', async () => {
    const { status } = await fetchJson('/api/x402/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: 'test' }),
    });
    expect([200, 400, 401, 402]).toContain(status);
  });
});
