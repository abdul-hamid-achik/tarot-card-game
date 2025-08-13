import { NextResponse } from 'next/server';
import { createInitialState, applyIntent, checkVictory } from '@tarot/game-sim/dist/index.js';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const seed = (body.seed as string) || 'seed-start';
  const players = (body.players as string[]) || ['U1', 'U2'];
  const s0 = createInitialState({ matchId: `m_${seed}`, seed, players });
  return NextResponse.json({ state: s0 });
}
