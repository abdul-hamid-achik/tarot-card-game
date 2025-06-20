import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = body.userId ?? 'anon';
  // Stub: immediately return a queued status with a fake match id
  return NextResponse.json({ queued: true, matchId: `m_${userId}_${Date.now()}` });
}
