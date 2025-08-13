import { describe, it, expect } from 'vitest';
import { parseEffect, executeEffectForPlayer } from '../src/effects.js';

describe('Orientation-aware effects', () => {
    it('branches by orientation using branch(cardId,upright,reversed)', () => {
        const state: any = {
            players: ['p1', 'p2'],
            orientations: { c1: 'upright' },
            resources: {},
            stacks: {},
            hands: {},
            battlefield: {},
            fate: { p1: 0, p2: 0 },
        };
        // branch selects gain(2) when upright, otherwise gain(1)
        const call = parseEffect('branch(c1,gain, gain)');
        const after = executeEffectForPlayer(state, call, 'p1', 'seed');
        expect(after.resources['p1']).toBe(2);
    });
});


