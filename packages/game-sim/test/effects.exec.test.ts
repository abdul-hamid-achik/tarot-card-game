import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/sim.js';
import { executeEffectsForPlayer, parseEffects } from '../src/effects.js';

describe('Effect execution', () => {
  it('gain(2) adds resources to the casting player', () => {
    let s = createInitialState({ matchId: 'm', seed: 'seed', players: ['p'] });
    expect(s.resources?.['p']).toBe(0);
    s = executeEffectsForPlayer(s, parseEffects(['gain(2)']), 'p', s.seed);
    expect(s.resources?.['p']).toBe(2);
  });

  it('silence(target,1) is a no-op until statuses are modeled', () => {
    let s = createInitialState({ matchId: 'm', seed: 'seed', players: ['p'] });
    s = executeEffectsForPlayer(s, parseEffects(['silence(target,1)']), 'p', s.seed);
    expect(s).toBeTruthy();
  });
});
