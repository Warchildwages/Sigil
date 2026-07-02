import { NextResponse } from 'next/server';
import { assessJurisdictionRisk } from '../../../lib/compliance-engine';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const jurisdiction = url.searchParams.get('jurisdiction');

  if (!sessionId && !jurisdiction) {
    return NextResponse.json({ error: 'Provide sessionId or jurisdiction' }, { status: 400 });
  }

  const result = jurisdiction
    ? assessJurisdictionRisk(jurisdiction)
    : { status: 'pending', sessionId };

  return NextResponse.json({
    sessionId: sessionId ?? `comp_${Date.now()}`,
    status: 'completed',
    result,
    timestamp: new Date().toISOString(),
  });
}
