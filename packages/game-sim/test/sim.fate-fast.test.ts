import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Fate costs and Fast responses', () => {
    it('consumes fate for flip/peek/force_draw and respects one response per player', () => {
        const base = createInitialState({ matchId: 'm1', seed: 's', players: ['p1', 'p2'] });
        // open a reaction window by simulating a board change
        const s1 = { ...base, reactionWindow: { open: true, responded: { p1: false, p2: false } }, fate: { p1: 3, p2: 3 } } as typeof base;

        const s2 = applyIntent(s1, { type: 'flip_orientation', playerId: 'p1', cardId: 'c1' } as any);
        expect(s2.fate['p1']).toBe(2);
        expect(s2.reactionWindow?.responded['p1']).toBe(true);

        // p1 cannot respond again in same window
        const s3 = applyIntent(s2, { type: 'peek', playerId: 'p1', count: 2 } as any);
        expect(s3.fate['p1']).toBe(2);

        // p2 uses force_draw for 2 fate
        const s4 = applyIntent(s3, { type: 'force_draw', playerId: 'p2' } as any);
        expect(s4.fate['p2']).toBe(1);
        // window should close after both responded
        expect(s4.reactionWindow?.open).toBe(false);
    });

    it('block_flip is once per game and costs fate', () => {
        const base = createInitialState({ matchId: 'm2', seed: 's', players: ['p1', 'p2'] });
        const s1 = { ...base, reactionWindow: { open: true, responded: { p1: false, p2: false } }, fate: { p1: 3, p2: 3 } } as typeof base;
        const s2 = applyIntent(s1, { type: 'block_flip', playerId: 'p1', targetPlayerId: 'p2', cardId: 'cX' } as any);
        expect(s2.fate['p1']).toBe(1);
        // try again in the same window should fail (once per game)
        const s3 = applyIntent(s2, { type: 'block_flip', playerId: 'p1', targetPlayerId: 'p2', cardId: 'cY' } as any);
        expect(s3.fate['p1']).toBe(1);
    });
});


