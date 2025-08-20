import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import cards from '@/data/cards.json';

export const dynamic = 'force-dynamic';

type SeedCard = { id: string; name: string; suit: string; cost: number; type: string; rarity: string; set: string };

export async function POST() {
  try {
    const db = await getDb();
    for (const c of cards as SeedCard[]) {
      // @ts-expect-error raw SQL
      await db.run?.("INSERT OR IGNORE INTO cards (id, name, suit, cost, type, rarity, set) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        c.id, c.name, c.suit, c.cost, c.type, c.rarity, c.set,
      ]);
    }
    return NextResponse.json({ ok: true, count: (cards as SeedCard[]).length });
  } catch (error) {
    console.error('Failed to seed cards:', error);
    return NextResponse.json({ error: 'Failed to seed cards' }, { status: 500 });
  }
}
