import { NextResponse } from 'next/server';
import { resetDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await resetDb();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to reset database:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
