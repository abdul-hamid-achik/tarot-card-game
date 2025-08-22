import { NextResponse } from 'next/server';
import { TarotSimulator } from '@tarot/game-sim';
import { loadDeckManifest } from '@/lib/cardAssets';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get('seed') ?? 'sse-seed';
  const p1 = url.searchParams.get('p1') ?? 'P1';
  const p2 = url.searchParams.get('p2') ?? 'P2';
  const stepsParam = url.searchParams.get('steps');
  const deck = url.searchParams.get('deck') ?? 'classic';
  const stepsTarget = stepsParam ? Math.max(1, Math.min(200, Number(stepsParam))) : 20;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // Create initial state with TarotSimulator
      const state = TarotSimulator.createInitialState({
        matchId: 'm_sse',
        seed,
        players: [p1, p2],
        cardLibrary: {},
        decks: { [p1]: [], [p2]: [] }
      });
      controller.enqueue(encoder.encode(`event: meta\n` + `data: ${JSON.stringify({ seed, players: [p1, p2], steps: stepsTarget })}\n\n`));
      const steps = [];
      // Prepare visual card ids from deck manifest
      const manifest = loadDeckManifest(deck);
      const cardIds = Array.isArray(manifest?.cards) && manifest!.cards.length > 0
        ? manifest!.cards.map((c) => c.id)
        : Array.from({ length: 22 }, (_, i) => `major_${String(i).padStart(2, '0')}`);
      const canonicalRe = /^(major_\d{2}|(wands|cups|swords|pentacles)_(\d{2}|page|knight|queen|king))$/;
      for (const step of steps) {
        const idx = (step as any).idx ?? 0;
        const rawId: string | undefined = (step as any)?.intent?.cardId;
        const visualCardId = rawId && canonicalRe.test(rawId) ? rawId : cardIds[idx % cardIds.length];
        const out = { ...step, deck, visualCardId };
        controller.enqueue(encoder.encode(`event: step\n` + `data: ${JSON.stringify(out)}\n\n`));
        await new Promise((r) => setTimeout(r, 50));
      }
      const finalResult = { winnerId: null }; // Placeholder for now
      controller.enqueue(encoder.encode(
        `event: done\n` + `data: ${JSON.stringify({ ok: true, winnerId: finalResult.winnerId ?? null, steps: steps.length })}\n\n`
      ));
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
