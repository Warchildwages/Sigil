/**
 * Signet Agent E2E Test Suite
 *
 * Runs against a live Next.js dev server (typically http://localhost:3000).
 * Start with: pnpm exec turbo run dev --filter=@sigil/demo
 * Then run: pnpm exec vitest run apps/demo/__tests__/agent/e2e.test.ts
 */
import { beforeAll, describe, expect, it } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${url}`, options);
  const body = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body };
}

beforeAll(async () => {
  // Wait for dev server (fast fail — 3 retries = 3s)
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Skip E2E suite if no server — don't throw, let all tests skip
  console.warn(`E2E: Dev server not reachable at ${BASE_URL} — skipping E2E suite`);
}, 5_000);

describe('Agent Status Endpoint', () => {
  it('GET /api/agent/status returns 200 with valid AgentStatusResponse', async () => {
    const { status, body } = await fetchJson('/api/agent/status');
    expect(status).toBe(200);
    expect(body).toBeDefined();
    expect(body.wallet).toBeDefined();
    expect(body.wallet.address).toEqual(expect.any(String));
    expect(body.wallet.chain).toEqual(expect.any(String));
    expect(body.wallet.balanceUSDC).toEqual(expect.any(String));
    expect(body.identity).toBeDefined();
    expect(body.identity.attested).toEqual(expect.any(Boolean));
    expect(body.x402).toBeDefined();
    expect(body.x402.listed).toEqual(expect.any(Boolean));
    expect(body.x402.serviceId).toEqual(expect.any(String));
    expect(body.x402.marketplaceUrl).toEqual(expect.any(String));
    expect(body.x402.pricing).toEqual(expect.any(Object));
    expect(body.uptime).toEqual(expect.any(String));
    expect(body.version).toEqual(expect.any(String));
  });

  it('GET /api/agent/status returns CORS header', async () => {
    const { headers } = await fetchJson('/api/agent/status');
    expect(headers.get('access-control-allow-origin')).toBe('*');
  });

  it('GET /api/agent/status returns Cache-Control header', async () => {
    const { headers } = await fetchJson('/api/agent/status');
    expect(headers.get('cache-control')).toContain('max-age=60');
  });
});

describe('x402 Service Info', () => {
  it('GET /api/x402/service-info returns 200 with valid X402ServiceListing', async () => {
    const { status, body } = await fetchJson('/api/x402/service-info');
    expect(status).toBe(200);
    expect(body).toBeDefined();
    expect(body.serviceId).toBe('sigil-v1');
    expect(body.name).toContain('Sigil');
    expect(body.operations.analyze.price).toEqual(expect.any(Number));
    expect(body.operations.knowledge.price).toEqual(expect.any(Number));
  });
});

describe('x402 Paid Endpoints (Payment Required)', () => {
  it('POST /api/x402/analyze returns 402 without payment proof', async () => {
    const { status, headers } = await fetchJson('/api/x402/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText: 'Test contract text.' }),
    });
    expect(status).toBe(402);
    expect(headers.get('x-x402-payment-required')).toBe('true');
  });

  it('POST /api/x402/knowledge returns 402 without payment proof', async () => {
    const { status, headers } = await fetchJson('/api/x402/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is an NDA?' }),
    });
    expect(status).toBe(402);
    expect(headers.get('x-x402-payment-required')).toBe('true');
  });
});

describe('x402 Payment Verification', () => {
  it('POST /api/x402/analyze with valid payment proof returns 200', async () => {
    const paymentProof = JSON.stringify({
      txHash: '0xabc123def4567890123456789012345678901234567890123456789012345678',
      amount: '1.00',
      timestamp: new Date().toISOString(),
    });

    const { status, body } = await fetchJson('/api/x402/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-x402-payment-proof': paymentProof,
      },
      body: JSON.stringify({ documentText: 'Test contract text for analysis.' }),
    });
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });

  it('POST /api/x402/knowledge with valid payment proof returns 200', async () => {
    const paymentProof = JSON.stringify({
      txHash: '0xdef7890123456789012345678901234567890123456789012345678901234567',
      amount: '0.50',
      timestamp: new Date().toISOString(),
    });

    const { status, body } = await fetchJson('/api/x402/knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-x402-payment-proof': paymentProof,
      },
      body: JSON.stringify({ query: 'What legal structure for a web3 startup?' }),
    });
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });
});

describe('Agent Wallet Status', () => {
  it('GET /api/agent/wallet/status returns 200 with wallet data', async () => {
    const { status, body } = await fetchJson('/api/agent/wallet/status');
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });
});

describe('Agent Page', () => {
  it('GET /agent returns 200 (page renders)', async () => {
    const res = await fetch(`${BASE_URL}/agent`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Sigil');
  });
});
