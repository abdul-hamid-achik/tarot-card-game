# WS Protocol (Draft)

- Client → Server
  - `intent`: `{ type: 'intent', intent: { type: 'play_card' | 'draw' | 'end_turn', ... }, matchId, playerId }`
  - `subscribe`: `{ type: 'subscribe', matchId }`
- Server → Client
  - `hello`: `{ type: 'hello', t }`
  - `tick`: `{ type: 'tick', t }` (stub heartbeat)
  - `state_diff`: `{ type: 'state_diff', matchId, step, diff }` (future)
  - `error`: `{ type: 'error', message }`

Next steps
- Replace tick with simulator-driven `state_diff`
- Maintain per-match rooms and subscriptions
- Validate intents and apply via simulator
