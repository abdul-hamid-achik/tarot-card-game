import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Fast legality', () => {
    it('rejects flip_orientation when card is neither in hand nor on board', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const s1: any = { ...s0, reactionWindow: { open: true, responded: { p1: false, p2: false } }, fate: { p1: 3, p2: 3 } };
        const s2 = applyIntent(s1, { type: 'flip_orientation', playerId: 'p1', cardId: 'cX' } as any);
        // Fate unchanged since invalid
        expect((s2.fate as any)['p1']).toBe(3);
    });

    it('rejects block_flip targeting self or invalid player', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const s1: any = { ...s0, reactionWindow: { open: true, responded: { p1: false, p2: false } }, fate: { p1: 3, p2: 3 } };
        const s2 = applyIntent(s1, { type: 'block_flip', playerId: 'p1', targetPlayerId: 'p1', cardId: 'cX' } as any);
        expect((s2.fate as any)['p1']).toBe(3);
        const s3 = applyIntent(s1, { type: 'block_flip', playerId: 'p1', targetPlayerId: 'p9', cardId: 'cX' } as any);
        expect((s3.fate as any)['p1']).toBe(3);
    });
});



