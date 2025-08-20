import { NextResponse } from 'next/server';
import { resetDb } from '@/lib/db';
import { gameLogger } from '@tarot/game-logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  gameLogger.logAction('api_admin_reset_db_start', {
    requestId,
    endpoint: '/api/admin/reset-db',
    method: 'POST',
    warning: 'Database reset operation initiated'
  }, true, 'Admin database reset initiated');

  try {
    await resetDb();
    const duration = Date.now() - startTime;

    gameLogger.logAction('api_admin_reset_db_success', {
      requestId,
      duration
    }, true, 'Database reset completed successfully');

    return NextResponse.json({ ok: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    gameLogger.logAction('api_admin_reset_db_error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Database reset failed');

    console.error('Failed to reset database:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
