import { describe, it, expect } from 'vitest';
import { createInitialState, replayWithLog } from '../src/sim.js';

const seed = 'timeline-seed-1';

describe('Replay timeline', () => {
  it('logs per-step turn progression', () => {
    const s0 = createInitialState({ matchId: 'm_t', seed, players: ['p1', 'p2'] });
    const { result, steps } = replayWithLog(s0, [
      { type: 'play_card', playerId: 'p1', cardId: 'a' },
      { type: 'end_turn', playerId: 'p1' },
      { type: 'play_card', playerId: 'p2', cardId: 'b' },
      { type: 'end_turn', playerId: 'p2' },
    ]);
    expect(result.state.turn).toBe(2);
    expect(steps.map((s) => s.turn)).toEqual([0, 1, 1, 2]);
  });
});
