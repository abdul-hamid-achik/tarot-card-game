import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { gameLogger } from '@tarot/game-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  gameLogger.logAction('api_decks_get_start', {
    requestId,
    endpoint: '/api/decks',
    method: 'GET'
  }, true, 'Decks API endpoint called');

  try {
    const sqlite = getSqlite();
    const stmt = sqlite.prepare('SELECT id, owner_id as ownerId, format FROM decks');
    const decks = await stmt.all();

    const duration = Date.now() - startTime;
    gameLogger.logAction('api_decks_get_success', {
      requestId,
      deckCount: decks.length,
      duration,
      formats: [...new Set(decks.map((d: any) => d.format))]
    }, true, 'Decks retrieved successfully');

    return NextResponse.json({ decks });
  } catch (error) {
    const duration = Date.now() - startTime;
    gameLogger.logAction('api_decks_get_error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Failed to fetch decks');

    console.error('Failed to fetch decks:', error);
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 });
  }
}
