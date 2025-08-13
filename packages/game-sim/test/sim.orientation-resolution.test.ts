import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Orientation-based effect on play resolution', () => {
    it('executes upright or reversed effect based on orientation (cost first, then effect)', () => {
        let s: any = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        s = { ...s, hands: { p1: { hand: ['c1'] } }, resources: { p1: 2, p2: 0 }, cardLibrary: { c1: { upright: { effect: 'gain(2)' }, reversed: { effect: 'gain(1)' } } } };
        s = applyIntent(s, { type: 'play_card', playerId: 'p1', cardId: 'c1' });
        // Start 2, pay 1 => 1, then gain 2 => 3
        expect((s.resources as any)['p1']).toBe(3);
        // Now set reversed orientation and play another copy
        s = { ...s, hands: { p1: { hand: ['c1'] } }, resources: { p1: 2, p2: 0 }, orientations: { c1: 'reversed' }, reactionWindow: { open: false, responded: { p1: false, p2: false } } } as any;
        s = applyIntent(s, { type: 'play_card', playerId: 'p1', cardId: 'c1' });
        // Start 2, pay 1 => 1, then gain 1 => 2
        expect((s.resources as any)['p1']).toBe(2);
    });
});


