import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  return NextResponse.json({
    sessionId: sessionId ?? `val_${Date.now()}`,
    status: 'completed',
    message: sessionId ? 'Verification completed' : 'No active session',
    timestamp: new Date().toISOString(),
  });
}
