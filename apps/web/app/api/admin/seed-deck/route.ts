import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = await getDb();
    // @ts-expect-error raw SQL
    await db.run?.("INSERT INTO decks (id, owner_id, format) VALUES (?, ?, ?)", [
      `deck_${Date.now()}`, 'u_demo', 'standard',
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to seed deck:', error);
    return NextResponse.json({ error: 'Failed to seed deck' }, { status: 500 });
  }
}
