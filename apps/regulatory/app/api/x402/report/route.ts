import { NextRequest, NextResponse } from 'next/server';
import { getStandards, estimateDeadlines } from '../../../lib/regulatory-engine';

export async function POST(req: NextRequest) {
  try {
    const body: { sessionId: string; jurisdiction: string } = await req.json();
    const standards = getStandards(body.jurisdiction);
    const deadlines = estimateDeadlines(standards.standards);

    return NextResponse.json({
      reportId: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: body.sessionId,
      generatedAt: new Date().toISOString(),
      jurisdiction: body.jurisdiction,
      applicableStandards: standards.standards,
      requiredFilings: standards.filings,
      deadlines,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'REPORT_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
