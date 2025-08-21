import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import cards from '@/data/cards.json';
import { gameLogger } from '@tarot/game-logger';

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
    gameLogger.logAction('api_admin_seed_cards_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, false, 'Failed to seed cards');
    return NextResponse.json({ error: 'Failed to seed cards' }, { status: 500 });
  }
}
