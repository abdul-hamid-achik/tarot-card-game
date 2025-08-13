import { describe, it, expect } from 'vitest';
import { checkVictory, createInitialState } from '../src/sim.js';

describe('Arcana Trials victory', () => {
    it('wins when a player has 3 completed trials', () => {
        const s0 = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        const s1: any = { ...s0, trials: { p1: { sun: true, moon: true, judgement: true }, p2: {} } };
        expect(checkVictory(s1, 999)).toBe('p1');
    });
});


