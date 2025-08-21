import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gameLogger } from '@tarot/game-logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await db.createDeck({
      id: `deck_${Date.now()}`,
      ownerId: 'u_demo',
      format: 'standard',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    gameLogger.logAction('api_admin_seed_deck_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, false, 'Failed to seed deck');
    return NextResponse.json({ error: 'Failed to seed deck' }, { status: 500 });
  }
}
