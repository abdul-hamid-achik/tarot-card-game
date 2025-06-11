import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/sim.js';
import { createGoldenTimeline } from '../src/golden.js';

const seed = 'golden-seed-1';

describe('Golden timeline snapshots', () => {
  it('captures per-step states', () => {
    const s0 = createInitialState({ matchId: 'm', seed, players: ['a', 'b'] });
    const snaps = createGoldenTimeline(s0, [
      { type: 'draw', playerId: 'a', cardId: 'x' },
      { type: 'end_turn', playerId: 'a' },
      { type: 'play_card', playerId: 'a', cardId: 'x' },
    ]);
    expect(snaps.length).toBe(3);
    expect(snaps[0].stateJSON.includes('"hands"')).toBe(true);
    expect(snaps[2].stateJSON.includes('"battlefield"')).toBe(true);
  });
});
