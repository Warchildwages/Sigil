import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'regulatory',
    status: 'healthy',
    version: '0.1.0',
    operations: ['map', 'report', 'status', 'demo'],
    supportedJurisdictions: ['US', 'UK', 'EU', 'SG', 'JP', 'CH'],
    frameworks: ['MiCA', 'SEC', 'FCA', 'MAS', 'FINMA', 'eIDAS2'],
  });
}
