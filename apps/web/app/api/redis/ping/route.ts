import { NextResponse } from 'next/server';

export function GET() {
  // Stub: always healthy; later wire real Redis connection/ping
  return NextResponse.json({ ok: true, redis: 'stub' });
}
