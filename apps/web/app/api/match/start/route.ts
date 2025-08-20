import { NextResponse } from 'next/server';
import { runHeadlessMatch } from '@tarot/game-sim/dist/index.js';
import { gameLogger } from '@tarot/game-logger';

export async function POST(req: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  gameLogger.logAction('api_match_start_post_start', {
    requestId,
    endpoint: '/api/match/start',
    method: 'POST'
  }, true, 'Match start API endpoint called');

  try {
    const body = await req.json().catch(() => ({}));
    const seed = (body.seed as string) || 'seed-start';
    const players = (body.players as string[]) || ['U1', 'U2'];

    gameLogger.logAction('api_match_start_simulation_start', {
      requestId,
      seed,
      players,
      playerCount: players.length
    }, true, 'Starting headless match simulation');

    const simStartTime = Date.now();
    const res = await runHeadlessMatch(seed, players, 3, 300);
    const simDuration = Date.now() - simStartTime;

    const totalDuration = Date.now() - startTime;

    gameLogger.logAction('api_match_start_success', {
      requestId,
      seed,
      players,
      winnerId: res.winnerId,
      steps: res.steps,
      simulationDuration: simDuration,
      totalDuration
    }, true, 'Match simulation completed successfully');

    return NextResponse.json({ match: { winnerId: res.winnerId, steps: res.steps } });
  } catch (error) {
    const duration = Date.now() - startTime;
    gameLogger.logAction('api_match_start_error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Match start failed');

    console.error('Match start error:', error);
    return NextResponse.json({ error: 'Failed to start match' }, { status: 500 });
  }
}
