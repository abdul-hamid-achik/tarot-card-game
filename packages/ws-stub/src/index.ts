import { WebSocketServer } from 'ws';

const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8787;
const wss = new WebSocketServer({ port });

import { createInitialState, generateIntents, replayWithLog } from '@tarot/game-sim/dist/index.js';

wss.on('connection', (ws: import('ws').WebSocket) => {
  ws.send(JSON.stringify({ type: 'hello', t: Date.now() }));
  let timer: NodeJS.Timeout | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg && msg.type === 'subscribe') {
        const seed: string = msg.seed ?? 'ws-seed';
        const players: string[] = Array.isArray(msg.players) ? msg.players : ['P1', 'P2'];
        const s0 = createInitialState({ matchId: msg.matchId ?? 'm_ws', seed, players });
        const intents = generateIntents(seed, Number(msg.steps ?? 30), players);
        const { steps } = replayWithLog(s0, intents);
        let i = 0;
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (i >= steps.length) {
            if (timer) clearInterval(timer);
            ws.send(JSON.stringify({ type: 'done' }));
            return;
          }
          ws.send(JSON.stringify({ type: 'state_diff', step: steps[i] }));
          i++;
        }, 100);
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid_json' }));
    }
  });

  ws.on('close', () => {
    if (timer) clearInterval(timer);
  });
});

console.log(`[ws-stub] listening on ws://localhost:${port}`);
