import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Trigger queue processing', () => {
    it('processes up to 3 triggers per phase advance', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const withQueue = { ...s0, triggerQueue: Array.from({ length: 5 }).map((_, i) => ({ id: `t${i}` })) } as typeof s0;
        const s1 = applyIntent(withQueue, { type: 'end_turn', playerId: 'p1' }); // draw->main, process 3
        expect((s1.stacks as any).triggerProcessed).toBe(3);
        expect(s1.triggerQueue?.length).toBe(2);
        const s2 = applyIntent(s1, { type: 'end_turn', playerId: 'p1' }); // main->combat, process remaining 2
        expect((s2.stacks as any).triggerProcessed).toBe(5);
        expect(s2.triggerQueue?.length).toBe(0);
    });
});


