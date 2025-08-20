import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await db.createDeck({
      id: `deck_${Date.now()}`,
      ownerId: 'u_demo',
      format: 'standard',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to seed deck:', error);
    return NextResponse.json({ error: 'Failed to seed deck' }, { status: 500 });
  }
}
