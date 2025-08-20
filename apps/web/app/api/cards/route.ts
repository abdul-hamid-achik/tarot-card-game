import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { gameLogger } from '@tarot/game-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  gameLogger.logAction('api_cards_get_start', {
    requestId,
    endpoint: '/api/cards',
    method: 'GET'
  }, true, 'Cards API endpoint called');

  try {
    const sqlite = getSqlite();
    const stmt = sqlite.prepare('SELECT id, name, suit, cost, type, rarity, card_set FROM cards');
    const cards = await stmt.all();

    const duration = Date.now() - startTime;
    gameLogger.logAction('api_cards_get_success', {
      requestId,
      cardCount: cards.length,
      duration,
      suits: [...new Set(cards.map((c: any) => c.suit))],
      types: [...new Set(cards.map((c: any) => c.type))]
    }, true, 'Cards retrieved successfully');

    return NextResponse.json({ cards });
  } catch (error) {
    const duration = Date.now() - startTime;
    gameLogger.logAction('api_cards_get_error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Failed to fetch cards');

    console.error('Failed to fetch cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
