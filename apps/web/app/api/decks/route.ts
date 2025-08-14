import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const sqlite = getSqlite();
  const stmt = sqlite.prepare('SELECT id, owner_id as ownerId, format FROM decks');
  const decks = stmt.all();
  return NextResponse.json({ decks });
}
