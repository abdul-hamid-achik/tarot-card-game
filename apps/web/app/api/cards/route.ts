import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const sqlite = getSqlite();
  // "set" is a SQLite keyword; quote it to use as a column identifier
  const stmt = sqlite.prepare('SELECT id, name, suit, cost, type, rarity, "set" AS set FROM cards');
  const cards = stmt.all();
  return NextResponse.json({ cards });
}
