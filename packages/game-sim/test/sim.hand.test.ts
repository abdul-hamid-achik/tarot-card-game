import { describe, it, expect } from 'vitest';
import { createInitialState, applyIntent } from '../src/sim.js';

interface HandsShape { [playerId: string]: { hand: string[] } }
interface BattlefieldShape { [playerId: string]: { played: string[] } }

describe('Hand and play validations', () => {
  it('cannot play a card not in hand', () => {
    let s = createInitialState({ matchId: 'm', seed: 's', players: ['p'] });
    s = applyIntent(s, { type: 'play_card', playerId: 'p', cardId: 'x' });
    expect((s.battlefield as BattlefieldShape)['p']).toBeUndefined();
  });

  it('draw then play moves card from hand to battlefield', () => {
    let s = createInitialState({ matchId: 'm', seed: 's', players: ['p'] });
    s = applyIntent(s, { type: 'draw', playerId: 'p', cardId: 'x' });
    expect((s.hands as HandsShape)['p'].hand).toEqual(['x']);
    s = applyIntent(s, { type: 'play_card', playerId: 'p', cardId: 'x' });
    expect((s.hands as HandsShape)['p'].hand).toEqual([]);
    expect((s.battlefield as BattlefieldShape)['p'].played).toEqual(['x']);
  });
});
