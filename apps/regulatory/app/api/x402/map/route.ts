import { NextRequest, NextResponse } from 'next/server';
import { runRegulatoryCheck, type RegulatoryCheck } from '../../../../lib/regulatory-engine';

export async function POST(req: NextRequest) {
  try {
    const body: RegulatoryCheck = await req.json();
    const result = runRegulatoryCheck(body);

    return NextResponse.json({
      sessionId: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reportable: result.reportable,
      requiredFilings: result.requiredFilings,
      deadlines: result.deadlines,
      restrictions: result.restrictions,
      applicableStandards: result.applicableStandards,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'REGULATORY_MAP_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
