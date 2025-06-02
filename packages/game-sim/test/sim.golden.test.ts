import { describe, it, expect } from 'vitest';
import { createInitialState, replay } from '../src/sim.js';
import { stableStringify } from '../src/serialize.js';

const seed = 'seed-9f9f';

import type { IntentInput } from '../src/schemas.js';
function goldenFor(intents: IntentInput[]) {
  const s0 = createInitialState({ matchId: 'm_gold', seed, players: ['p1', 'p2'] });
  const res = replay(s0, intents);
  return stableStringify(res.state);
}

describe('Golden master snapshots', () => {
  it('sequence A is stable', () => {
    const out = goldenFor([
      { type: 'end_turn', playerId: 'p1' },
      { type: 'play_card', playerId: 'p2', cardId: 'x' },
      { type: 'end_turn', playerId: 'p2' },
    ]);
    const obj = JSON.parse(out);
    expect(obj).toEqual({
      battlefield: { p2: { played: ['x'] } },
      fate: { p1: 0, p2: 0 },
      hands: {},
      matchId: 'm_gold',
      players: ['p1', 'p2'],
      seed: 'seed-9f9f',
      stacks: {},
      turn: 2,
    });
  });
});
