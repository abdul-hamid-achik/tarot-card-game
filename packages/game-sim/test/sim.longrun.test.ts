import { describe, it, expect } from 'vitest';
import { createInitialState, replay, generateIntents } from '../src/sim.js';
import { stableStringify } from '../src/serialize.js';

describe('Long-run deterministic replay (100 actions)', () => {
  it('replays 100 seeded actions with deterministic equality', () => {
    const players = ['u1', 'u2'];
    const seed = 'seed-longrun-1';
    const s0a = createInitialState({ matchId: 'mA', seed, players });
    const s0b = createInitialState({ matchId: 'mB', seed, players });
    const intents = generateIntents(seed, 100, players);
    const a = replay(s0a, intents);
    const b = replay(s0b, intents);
    const normalize = (s: unknown) => ({ ...JSON.parse(stableStringify(s as object)), matchId: 'X' });
    expect(normalize(a.state)).toEqual(normalize(b.state));
  });
});
