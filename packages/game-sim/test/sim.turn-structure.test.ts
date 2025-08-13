import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Turn structure & reaction window', () => {
    it('advances phases draw -> main -> combat -> end, then next turn draw with fate gain', () => {
        const s0 = createInitialState({ matchId: 'm1', seed: 'z', players: ['p1', 'p2'] });
        // initial phase is draw
        expect(s0.phase).toBe('draw');

        // end_turn in draw advances to main (not next turn yet)
        const s1 = applyIntent(s0, { type: 'end_turn', playerId: 'p1' });
        expect(s1.phase).toBe('main');
        expect(s1.turn).toBe(0);

        // end_turn in main -> combat
        const s2 = applyIntent(s1, { type: 'end_turn', playerId: 'p1' });
        expect(s2.phase).toBe('combat');
        expect(s2.turn).toBe(0);

        // end_turn in combat -> end
        const s3 = applyIntent(s2, { type: 'end_turn', playerId: 'p1' });
        expect(s3.phase).toBe('end');
        expect(s3.turn).toBe(0);

        // end_turn in end -> next turn draw; fate +1 to current player (p2 since turn=1 -> idx=1)
        const s4 = applyIntent(s3, { type: 'end_turn', playerId: 'p1' });
        expect(s4.phase).toBe('draw');
        expect(s4.turn).toBe(1);
        expect(s4.fate['p2']).toBe(1);
    });

    it('opens a reaction window on board-changing play', () => {
        const s0 = createInitialState({ matchId: 'm1', seed: 'z', players: ['p1', 'p2'] });
        const s1 = { ...s0, hands: { p1: { hand: ['c1'] } }, resources: { p1: 1, p2: 0 } } as typeof s0;
        const s2 = applyIntent(s1, { type: 'play_card', playerId: 'p1', cardId: 'c1' });
        expect(s2.reactionWindow?.open).toBe(true);
    });
});


