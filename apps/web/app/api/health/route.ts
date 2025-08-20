import { NextResponse } from 'next/server';
import { gameLogger } from '@tarot/game-logger';

export function GET() {
  gameLogger.logAction('api_health_check', {
    service: 'tarot-api',
    version: '0.0.1',
    timestamp: new Date().toISOString()
  }, true, 'Health check endpoint called');

  return NextResponse.json({ ok: true, service: 'tarot-api', version: '0.0.1' });
}
