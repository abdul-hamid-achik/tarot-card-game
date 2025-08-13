import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Deck + Peek/Force Draw', () => {
    it('peek reorders top 2, force_draw pulls from deck top', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const s1: any = { ...s0, decks: { p1: { draw: ['A', 'B', 'C'], discard: [] }, p2: { draw: [], discard: [] } }, reactionWindow: { open: true, responded: { p1: false, p2: false } }, fate: { p1: 3, p2: 3 }, hands: { p1: { hand: [] } } };
        const s2 = applyIntent(s1, { type: 'peek', playerId: 'p1', count: 2 } as any);
        expect((s2.decks as any).p1.draw.slice(0, 2)).toEqual(['B', 'A']);
        const s3 = applyIntent({ ...s2, reactionWindow: { open: true, responded: { p1: false, p2: false } } }, { type: 'force_draw', playerId: 'p1' } as any);
        expect((s3.hands as any).p1.hand).toEqual(['B']);
    });
});


