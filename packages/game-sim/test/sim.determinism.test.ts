import { describe, it, expect } from 'vitest';
import { createInitialState, replay } from '../src/sim.js';
import { stableStringify } from '../src/serialize.js';

import type { IntentInput } from '../src/schemas.js';
const intents: IntentInput[] = [
  { type: 'play_card', playerId: 'p1', cardId: 'x' },
  { type: 'end_turn', playerId: 'p1' },
  { type: 'play_card', playerId: 'p2', cardId: 'y' },
  { type: 'end_turn', playerId: 'p2' },
];

describe('Determinism', () => {
  it('same seed + intents => identical final state', () => {
    const s0a = createInitialState({ matchId: 'm1', seed: 'seed-a', players: ['p1', 'p2'] });
    const s0b = createInitialState({ matchId: 'm2', seed: 'seed-a', players: ['p1', 'p2'] });
    const a = replay(s0a, intents);
    const b = replay(s0b, intents);
    const normalize = (s: unknown) => ({ ...JSON.parse(stableStringify(s as object)), matchId: 'X' });
    expect(normalize(a.state)).toEqual(normalize(b.state));
  });
});
