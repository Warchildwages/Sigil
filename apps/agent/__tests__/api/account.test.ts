/**
 * Account Dashboard API Tests
 *
 * Tests for GET /api/account/dashboard.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @/lib/auth — must match the import path used by the route file
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

// Mock @sigil/db
const mockPrisma = {
  document: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  attestation: {
    count: vi.fn(),
  },
};

vi.mock('@sigil/db', () => ({
  prisma: mockPrisma,
}));

describe('GET /api/account/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getSession } = await import('@/lib/auth');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: false,
    });

    const { GET } = await import('../../src/app/api/account/dashboard/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns entity stats when authenticated', async () => {
    const { getSession } = await import('@/lib/auth');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      entityId: 'test-entity-1',
      entityName: 'Test User',
      entityType: 'individual',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    });

    mockPrisma.document.count.mockResolvedValue(5);
    mockPrisma.attestation.count.mockResolvedValue(3);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'My NDA',
        status: 'attested',
        attestations: [{ attestedAt: new Date('2026-06-15') }],
      },
      {
        id: 'doc-2',
        title: 'My Will',
        status: 'draft',
        attestations: [],
      },
    ]);

    const { GET } = await import('../../src/app/api/account/dashboard/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entityId).toBe('test-entity-1');
    expect(body.documentCount).toBe(5);
    expect(body.attestationCount).toBe(3);
    expect(body.recentDocuments).toHaveLength(2);
    expect(body.recentDocuments[0].title).toBe('My NDA');
    expect(body.recentDocuments[0].status).toBe('attested');
    expect(body.recentDocuments[0].attestedAt).toBe('2026-06-15T00:00:00.000Z');
  });

  it('handles empty document list', async () => {
    const { getSession } = await import('@/lib/auth');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      entityId: 'test-entity-empty',
      entityName: 'New User',
      entityType: 'individual',
      walletAddress: null,
    });

    mockPrisma.document.count.mockResolvedValue(0);
    mockPrisma.attestation.count.mockResolvedValue(0);
    mockPrisma.document.findMany.mockResolvedValue([]);

    const { GET } = await import('../../src/app/api/account/dashboard/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.documentCount).toBe(0);
    expect(body.attestationCount).toBe(0);
    expect(body.recentDocuments).toHaveLength(0);
  });

  it('returns 500 on database error', async () => {
    const { getSession } = await import('@/lib/auth');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      entityId: 'test-entity-error',
      entityName: 'Error User',
      entityType: 'individual',
      walletAddress: null,
    });

    mockPrisma.document.count.mockRejectedValue(new Error('DB connection failed'));

    const { GET } = await import('../../src/app/api/account/dashboard/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
