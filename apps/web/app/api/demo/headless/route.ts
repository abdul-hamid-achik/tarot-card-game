import { NextResponse } from 'next/server';
import { runHeadlessMatch } from '@tarot/game-sim';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const seed = (body.seed as string) || 'seed-demo';
  const res = await runHeadlessMatch(seed, ['P1', 'P2'], 3, 200);
  return NextResponse.json({ winnerId: res.winnerId, steps: res.steps });
}
