import { describe, it, expect } from 'vitest';
import { createInitialState, replay } from '../src/sim.js';

const seed = 'a1b2c3';

describe('Simulator snapshots', () => {
  it('replays a deterministic sequence (no-ops + end turns)', () => {
    const s0 = createInitialState({ matchId: 'm_1', seed, players: ['p1', 'p2'] });
    const res = replay(s0, [
      { type: 'play_card', playerId: 'p1', cardId: 'wands_01' },
      { type: 'end_turn', playerId: 'p1' },
      { type: 'play_card', playerId: 'p2', cardId: 'wands_02' },
      { type: 'end_turn', playerId: 'p2' },
    ]);
    expect(res.state.turn).toBe(2);
    expect(res.state.seed).toBe(seed);
  });
});
