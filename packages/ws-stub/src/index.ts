import { WebSocketServer } from 'ws';

const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8787;
const wss = new WebSocketServer({ port });

import { TarotSimulator } from '@tarot/game-sim/dist/index.js';

wss.on('connection', (ws: import('ws').WebSocket) => {
  ws.send(JSON.stringify({ type: 'hello', t: Date.now() }));
  let timer: NodeJS.Timeout | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg && msg.type === 'subscribe') {
        const seed: string = msg.seed ?? 'ws-seed';
        const players: string[] = Array.isArray(msg.players) ? msg.players : ['P1', 'P2'];
        // Create a simple game state update stream
        const state = TarotSimulator.createInitialState({
          matchId: msg.matchId ?? 'm_ws',
          seed: seed,
          players: players,
          cardLibrary: {},
          decks: Object.fromEntries(players.map(p => [p, []]))
        });
        
        // Send initial state
        ws.send(JSON.stringify({ type: 'state_diff', step: state }));
        
        // Simulate some dummy updates
        let i = 0;
        const maxSteps = Number(msg.steps ?? 30);
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (i >= maxSteps) {
            if (timer) clearInterval(timer);
            ws.send(JSON.stringify({ type: 'done' }));
            return;
          }
          ws.send(JSON.stringify({ type: 'state_diff', step: { turn: i + 1 } }));
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
