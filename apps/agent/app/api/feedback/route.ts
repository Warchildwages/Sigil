import { NextResponse } from 'next/server';

/**
 * POST /api/feedback
 *
 * Collects feedback from the FeedbackBox component.
 * Stores in Neon Postgres via Prisma.
 *
 * Spam protection:
 * - Honeypot field: if `_website` is filled, the submission is silently dropped (bot trap).
 * - Rate limiting is handled by the global middleware (60 req/min/IP).
 * - Message length capped at 5000 characters (Prisma @db.Text validation).
 * Manual monitoring for now; cron job will be added later.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pageUrl?: string;
      message?: string;
      email?: string | null;
      _website?: string; // honeypot — bots auto-fill this, humans never see it
    };

    // Honeypot check — silently drop bot submissions
    if (body._website && body._website.length > 0) {
      return NextResponse.json({ status: 'received' }, { status: 201 });
    }

    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 512) : 'unknown';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
    const email =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().slice(0, 256)
        : null;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    // Dynamic import so Prisma doesn't break during build if DB is down
    const { prisma } = await import('@signet/db');

    const feedback = await prisma.feedback.create({
      data: {
        pageUrl,
        message,
        email,
      },
    });

    return NextResponse.json({ id: feedback.id, status: 'received' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 },
    );
  }
}