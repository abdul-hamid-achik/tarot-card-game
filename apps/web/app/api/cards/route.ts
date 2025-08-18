import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const sqlite = getSqlite();
  const stmt = sqlite.prepare('SELECT id, name, suit, cost, type, rarity, card_set FROM cards');
  const cards = stmt.all();
  return NextResponse.json({ cards });
}
