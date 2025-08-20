import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import cards from '@/data/cards.json';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await db.seedDb(cards.map(card => ({
      name: card.name,
      suit: card.suit,
      cost: card.cost,
      type: card.type,
      rarity: card.rarity,
      cardSet: card.set,
    })));
    return NextResponse.json({ ok: true, count: cards.length });
  } catch (error) {
    console.error('Failed to seed cards:', error);
    return NextResponse.json({ error: 'Failed to seed cards' }, { status: 500 });
  }
}
