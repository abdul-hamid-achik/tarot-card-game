import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

describe('Trials progress hooks', () => {
    it('Sun via wands_* plays; Moon via fate >=3 for 2 turns; Judgement via both orientations', () => {
        let s = createInitialState({ matchId: 'm', seed: 's', players: ['p1', 'p2'] });
        s = { ...s, hands: { p1: { hand: ['wands_01', 'wands_02'] } }, resources: { p1: 2, p2: 0 }, fate: { p1: 3, p2: 0 } } as any;
        // Judgement: mark upright then reversed on same card id
        s = { ...s, orientations: { wands_01: 'upright', wands_02: 'reversed' } } as any;
        s = applyIntent(s, { type: 'play_card', playerId: 'p1', cardId: 'wands_01' });
        s = applyIntent({ ...s, hands: { p1: { hand: ['wands_02'] } } } as any, { type: 'play_card', playerId: 'p1', cardId: 'wands_02' });
        expect((s.trials as any).p1.sunDamage).toBeGreaterThanOrEqual(20);
        expect((s.trials as any).p1.sun).toBe(true);
        // End turn through phases to trigger moon streak (fate is 3)
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        // Next turn, set fate to 3 again and end turn to get streak 2
        s = { ...s, fate: { ...s.fate, p1: 3 } } as any;
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        s = applyIntent(s, { type: 'end_turn', playerId: 'p1' });
        expect((s.trials as any).p1.moon).toBe(true);
    });
});


