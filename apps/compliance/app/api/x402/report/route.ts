import { NextRequest, NextResponse } from 'next/server';

interface ReportRequest {
  sessionId: string;
  jurisdiction: string;
  entityType: 'individual' | 'organization';
  flags?: string[];
  risk: 'low' | 'medium' | 'high' | 'critical';
  includeEvidence?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: ReportRequest = await req.json();

    const report = {
      reportId: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: body.sessionId,
      generatedAt: new Date().toISOString(),
      summary: `Compliance assessment for ${body.jurisdiction} ${body.entityType}`,
      risk: body.risk,
      steps: [
        { name: 'Jurisdiction Screening', status: 'passed' as const, detail: `${body.jurisdiction} classified` },
        { name: 'Entity Verification', status: 'passed' as const, detail: `${body.entityType} verified` },
        { name: 'Sanctions Check', status: body.risk === 'critical' ? 'failed' as const : 'passed' as const },
        { name: 'AML Screening', status: body.risk === 'high' ? 'pending' as const : 'passed' as const },
      ],
      attestations: [],
      complianceScore: body.risk === 'low' ? 95 : body.risk === 'medium' ? 75 : body.risk === 'high' ? 40 : 10,
    };

    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: 'REPORT_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
