import { NextResponse } from 'next/server';
import { runHeadlessMatch } from '@tarot/game-sim/dist/index.js';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const seed = (body.seed as string) || 'seed-start';
  const players = (body.players as string[]) || ['U1', 'U2'];
  const res = await runHeadlessMatch(seed, players, 3, 300);
  return NextResponse.json({ match: { winnerId: res.winnerId, steps: res.steps } });
}
