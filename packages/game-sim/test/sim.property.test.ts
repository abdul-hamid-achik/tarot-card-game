import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInitialState, applyIntent } from '../src/sim.js';

const intentArb = fc.oneof(
  fc.record({ type: fc.constant('end_turn'), playerId: fc.string() }),
  fc.record({
    type: fc.constant('play_card'),
    playerId: fc.string(),
    cardId: fc.string(),
    target: fc.option(fc.string(), { nil: undefined }),
  })
);

describe('Simulator properties', () => {
  it('turn never decreases when applying intents', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.array(intentArb, { maxLength: 50 }), (seed, intents) => {
        let state = createInitialState({ matchId: 'm', seed, players: ['a', 'b'] });
        let prev = state.turn;
        for (const intent of intents) {
          const next = applyIntent(state, intent);
          expect(next.turn).toBeGreaterThanOrEqual(prev);
          prev = next.turn;
          state = next;
        }
      }),
      { numRuns: 50 }
    );
  });
});
