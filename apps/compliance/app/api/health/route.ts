import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'compliance',
    status: 'healthy',
    version: '0.1.0',
    operations: ['screen', 'report', 'status', 'demo'],
    jurisdictionCoverage: Object.keys({
      US: 'medium', UK: 'low', EU: 'low', SG: 'low', JP: 'low', CH: 'low',
      AE: 'medium', KR: 'medium', RU: 'critical', CN: 'high', IR: 'critical',
      KP: 'critical', SY: 'critical', CU: 'critical', VE: 'high',
    }).length,
  });
}
