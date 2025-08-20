import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlite = getSqlite();
    const stmt = sqlite.prepare('SELECT id, name, suit, cost, type, rarity, card_set FROM cards');
    const cards = await stmt.all();
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
