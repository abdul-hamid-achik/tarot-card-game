import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Reaction window order and closing', () => {
    it('origin player and the other player each get one response; window closes', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const s1: any = { ...s0, hands: { p1: { hand: ['c1'] } }, resources: { p1: 1, p2: 0 }, fate: { p1: 3, p2: 3 } };
        const s2 = applyIntent(s1, { type: 'play_card', playerId: 'p1', cardId: 'c1' });
        expect(s2.reactionWindow?.open).toBe(true);
        // Non-origin (p2) responds first
        const s3 = applyIntent(s2, { type: 'peek', playerId: 'p2', count: 2 } as any);
        expect(s3.reactionWindow?.responded['p2']).toBe(true);
        // Second response by non-origin should be ignored
        const s3b = applyIntent(s3, { type: 'peek', playerId: 'p2', count: 2 } as any);
        expect(s3b.reactionWindow?.responded['p2']).toBe(true);
        // Origin (p1) responds
        const s4 = applyIntent(s3, { type: 'flip_orientation', playerId: 'p1', cardId: 'c1' } as any);
        expect(s4.reactionWindow?.open).toBe(false);
    });
});


