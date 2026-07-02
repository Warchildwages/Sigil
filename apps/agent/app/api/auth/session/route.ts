// GET /api/auth/session — verify current session (used by frontend on page load)

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('GET /api/auth/session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}