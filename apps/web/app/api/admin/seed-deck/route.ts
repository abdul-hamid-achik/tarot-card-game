import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const db = getDb();
  // @ts-expect-error raw SQL
  db.run?.("INSERT INTO decks (id, owner_id, format) VALUES (?, ?, ?)", [
    `deck_${Date.now()}`, 'u_demo', 'standard',
  ]);
  return NextResponse.json({ ok: true });
}
