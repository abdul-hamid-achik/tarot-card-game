import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInitialState, applyIntent } from '../src/sim.js';

const intentArb = fc.oneof(
  fc.record({ type: fc.constant('end_turn'), playerId: fc.string() }),
  fc.record({ type: fc.constant('draw'), playerId: fc.string(), cardId: fc.string() }),
  fc.record({ type: fc.constant('play_card'), playerId: fc.string(), cardId: fc.string(), target: fc.option(fc.string(), { nil: undefined }) })
);

describe('Invariants', () => {
  it('resources never negative; hand cannot go below 0', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
        fc.array(intentArb, { maxLength: 200 }),
        (seed, players, intents) => {
          let s = createInitialState({ matchId: 'm', seed, players });
          const handCounts: Record<string, number> = Object.fromEntries(players.map((p) => [p, 0]));
          for (const intent of intents) {
            const prevHands = (s.hands as Record<string, { hand: string[] }>) || {};
            s = applyIntent(s, intent);
            // resources non-negative
            for (const p of players) {
              expect((s.resources?.[p] ?? 0)).toBeGreaterThanOrEqual(0);
            }
            // hand count not negative
            for (const p of players) {
              const count = ((s.hands as Record<string, { hand: string[] }>)?.[p]?.hand ?? []).length;
              expect(count).toBeGreaterThanOrEqual(0);
            }
            // play removes at most one instance
            if (intent.type === 'play_card' && (prevHands[intent.playerId]?.hand ?? []).includes(intent.cardId)) {
              const before = (prevHands[intent.playerId]?.hand ?? []).filter((c) => c === intent.cardId).length;
              const after = ((s.hands as Record<string, { hand: string[] }>)?.[intent.playerId]?.hand ?? []).filter((c) => c === intent.cardId).length;
              expect(before - after).toBeLessThanOrEqual(1);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
