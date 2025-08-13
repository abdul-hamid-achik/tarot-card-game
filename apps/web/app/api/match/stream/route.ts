import { NextResponse } from 'next/server';
import { createInitialState } from '@tarot/game-sim/dist/index.js';
import { generateIntents } from '@tarot/game-sim/dist/index.js';
import { replayWithLog } from '@tarot/game-sim/dist/index.js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get('seed') ?? 'sse-seed';
  const p1 = url.searchParams.get('p1') ?? 'P1';
  const p2 = url.searchParams.get('p2') ?? 'P2';
  const stepsParam = url.searchParams.get('steps');
  const stepsTarget = stepsParam ? Math.max(1, Math.min(200, Number(stepsParam))) : 20;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const s0 = createInitialState({ matchId: 'm_sse', seed, players: [p1, p2] });
      const intents = generateIntents(seed, stepsTarget, [p1, p2]);
      controller.enqueue(encoder.encode(`event: meta\n` + `data: ${JSON.stringify({ seed, players: [p1, p2], steps: stepsTarget })}\n\n`));
      const { steps } = replayWithLog(s0, intents);
      for (const step of steps) {
        controller.enqueue(encoder.encode(`event: step\n` + `data: ${JSON.stringify(step)}\n\n`));
        await new Promise((r) => setTimeout(r, 50));
      }
      controller.enqueue(encoder.encode(`event: done\n` + `data: {"ok":true}\n\n`));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
