import { NextRequest, NextResponse } from 'next/server';
import { runComplianceCheck, type ComplianceCheck } from '../../../../lib/compliance-engine';

export async function POST(req: NextRequest) {
  try {
    const body: ComplianceCheck = await req.json();
    const result = runComplianceCheck(body);

    return NextResponse.json({
      sessionId: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      passed: result.passed,
      risk: result.risk,
      flags: result.flags,
      requiredVerifications: result.requiredVerifications,
      evidence: result.evidence,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'COMPLIANCE_SCREEN_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
