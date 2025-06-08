import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';
import { executeEffectsForPlayer, parseEffects } from '../src/effects.js';

interface HandsShape { [playerId: string]: { hand: string[] } }

describe('both_discard_random', () => {
  it('discards 1 from both hands deterministically by seed', () => {
    let s = createInitialState({ matchId: 'm', seed: 'seed', players: ['a', 'b'] });
    s = applyIntent(s, { type: 'draw', playerId: 'a', cardId: 'a1' });
    s = applyIntent(s, { type: 'draw', playerId: 'a', cardId: 'a2' });
    s = applyIntent(s, { type: 'draw', playerId: 'b', cardId: 'b1' });
    s = applyIntent(s, { type: 'draw', playerId: 'b', cardId: 'b2' });

    const s1 = executeEffectsForPlayer(s, parseEffects(['both_discard_random(1)']), 'a', s.seed);
    const s2 = executeEffectsForPlayer(s, parseEffects(['both_discard_random(1)']), 'a', s.seed);

    expect((s1.hands as HandsShape)['a'].hand.length).toBe(1);
    expect((s1.hands as HandsShape)['b'].hand.length).toBe(1);
    expect(s1.hands).toEqual(s2.hands);
  });
});
