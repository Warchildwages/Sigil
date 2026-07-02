// GET /api/account/dashboard — aggregate entity stats for the /account page
// Requires valid JWT session. Returns document count, attestation count, and recent documents.

import { getSession } from '@/lib/auth';
import { prisma } from '@sigil/db';
import type { AccountDashboardData } from '@sigil/shared';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.entityId) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 },
      );
    }

    const entityId = session.entityId;

    // Fetch counts and recent documents in parallel
    const [documentCount, attestationCount, recentDocuments] = await Promise.all([
      prisma.document.count({
        where: { createdByEntityId: entityId },
      }),
      prisma.attestation.count({
        where: {
          document: { createdByEntityId: entityId },
        },
      }),
      prisma.document.findMany({
        where: { createdByEntityId: entityId },
        select: {
          id: true,
          title: true,
          status: true,
          attestations: {
            select: { attestedAt: true },
            orderBy: { attestedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const body: AccountDashboardData = {
      entityId: session.entityId,
      entityName: session.entityName || 'Unknown',
      entityType: session.entityType || 'individual',
      walletAddress: session.walletAddress || null,
      documentCount,
      attestationCount,
      recentDocuments: recentDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        attestedAt: doc.attestations[0]?.attestedAt?.toISOString() || null,
      })),
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('GET /api/account/dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
