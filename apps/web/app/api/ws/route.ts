import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Placeholder: Next.js app router does not support native WS easily here.
  // We expose an SSE endpoint at /api/match/stream for now.
  return NextResponse.json({ error: 'WebSocket not yet implemented, use /api/match/stream' }, { status: 501 });
}
