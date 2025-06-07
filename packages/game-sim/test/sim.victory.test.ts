import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent, checkVictory } from '../src/sim.js';

describe('Victory check', () => {
  it('first to 3 played cards wins (threshold=3)', () => {
    let s = createInitialState({ matchId: 'm', seed: 's', players: ['a', 'b'] });
    // Give resources and cards to a
    s = applyIntent(s, { type: 'draw', playerId: 'a', cardId: 'x1' });
    s = applyIntent(s, { type: 'end_turn', playerId: 'a' });
    s = applyIntent(s, { type: 'play_card', playerId: 'a', cardId: 'x1' });

    s = applyIntent(s, { type: 'draw', playerId: 'a', cardId: 'x2' });
    s = applyIntent(s, { type: 'end_turn', playerId: 'a' }); // b +1
    s = applyIntent(s, { type: 'end_turn', playerId: 'b' }); // a +1
    s = applyIntent(s, { type: 'play_card', playerId: 'a', cardId: 'x2' });

    s = applyIntent(s, { type: 'draw', playerId: 'a', cardId: 'x3' });
    s = applyIntent(s, { type: 'end_turn', playerId: 'a' }); // b +1
    s = applyIntent(s, { type: 'end_turn', playerId: 'b' }); // a +1
    s = applyIntent(s, { type: 'play_card', playerId: 'a', cardId: 'x3' });

    expect(checkVictory(s, 3)).toBe('a');
  });
});
