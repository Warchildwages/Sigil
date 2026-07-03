import { NextRequest, NextResponse } from 'next/server';
import { submitReputation } from '../../../lib/reputation';
import type { ReputationEvent } from '../../../lib/types';

/**
 * POST /api/report — Submit a reputation event
 *
 * Foreign agents, users, and other verifiers use this to report
 * transaction outcomes, disputes, and problems to Vera.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReputationEvent;

    if (!body.agentId || !body.type || !body.outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, type, outcome' },
        { status: 400 },
      );
    }

    body.eventId = body.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    body.timestamp = body.timestamp || new Date().toISOString();

    submitReputation(body);

    return NextResponse.json({
      accepted: true,
      eventId: body.eventId,
      agentId: body.agentId,
      detail: 'Reputation event recorded. Vera will index this for future queries.',
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'REPORT_FAILED', detail: (e as Error).message },
      { status: 400 },
    );
  }
}
