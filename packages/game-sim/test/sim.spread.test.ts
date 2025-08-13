import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Mulligan Spread bonuses', () => {
    it('Present: cost -1 on Turn 1; Past: refund +1 Fate on Turn 1/2', () => {
        const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
        // Turn 0 is player p1's first turn
        const withHand = { ...base, hands: { p1: { hand: ['cP', 'cA'] } }, resources: { p1: 1, p2: 0 }, fate: { p1: 0, p2: 0 } } as typeof base;
        const s1 = applyIntent(withHand, { type: 'assign_spread', playerId: 'p1', pastId: 'cA', presentId: 'cP' } as any);

        // Playing Present card should cost 0 (1 base -1 present = 0)
        const s2 = applyIntent(s1, { type: 'play_card', playerId: 'p1', cardId: 'cP' });
        expect((s2.resources as any)['p1']).toBe(1); // unchanged

        // Playing Past card on Turn 1 (turn index 0) refunds +1 Fate
        const s3 = applyIntent({ ...s2, hands: { p1: { hand: ['cA'] } } } as any, { type: 'play_card', playerId: 'p1', cardId: 'cA' });
        expect((s3.fate as any)['p1']).toBe(1);

        // Advance phases to end and to next turn
        const s4 = applyIntent(s3, { type: 'end_turn', playerId: 'p1' }); // draw->main
        const s5 = applyIntent(s4, { type: 'end_turn', playerId: 'p1' }); // main->combat
        const s6 = applyIntent(s5, { type: 'end_turn', playerId: 'p1' }); // combat->end
        const s7 = applyIntent(s6, { type: 'end_turn', playerId: 'p1' }); // end->next turn draw
        expect(s7.turn).toBe(1);

        // Past refund is also valid on Turn 2, but ensure consumed flag prevents double refund
        const s8 = applyIntent({ ...s7, hands: { p1: { hand: ['cA'] } } } as any, { type: 'play_card', playerId: 'p1', cardId: 'cA' });
        expect((s8.fate as any)['p1']).toBe((s7.fate as any)['p1']);
    });
});


