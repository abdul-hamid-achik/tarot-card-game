import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Auth route placeholder' }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.text();
  return NextResponse.json({ ok: true, received: body || null }, { status: 200 });
}
