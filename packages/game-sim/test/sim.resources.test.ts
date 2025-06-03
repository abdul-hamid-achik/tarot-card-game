import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

interface BattlefieldShape { [playerId: string]: { played: string[] } }

/**
 * Rules:
 * - end_turn ramps +1 resource to the current player (by turn index).
 * - play_card costs 1 resource; cannot play if insufficient resources.
 */
describe('Resources and costs', () => {
  it('cannot play without resources', () => {
    let s = createInitialState({ matchId: 'm', seed: 's', players: ['p'] });
    s = applyIntent(s, { type: 'draw', playerId: 'p', cardId: 'x' });
    s = applyIntent(s, { type: 'play_card', playerId: 'p', cardId: 'x' });
    expect((s.battlefield as BattlefieldShape)['p']).toBeUndefined();
  });

  it('ramp then play succeeds and spends resource', () => {
    let s = createInitialState({ matchId: 'm', seed: 's', players: ['p'] });
    s = applyIntent(s, { type: 'draw', playerId: 'p', cardId: 'x' });
    s = applyIntent(s, { type: 'end_turn', playerId: 'p' });
    expect(s.resources?.['p']).toBe(1);
    s = applyIntent(s, { type: 'play_card', playerId: 'p', cardId: 'x' });
    expect((s.battlefield as BattlefieldShape)['p'].played).toEqual(['x']);
    expect(s.resources?.['p']).toBe(0);
  });
});
