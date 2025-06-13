import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, service: 'tarot-api', version: '0.0.1' });
}
