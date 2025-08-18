import { describe, it, expect, beforeEach } from 'vitest';
import { applyIntent, createInitialState, checkVictory } from '../src/sim';
import { MatchState } from '../src/types';

describe('Tarot Card Mechanics', () => {
  let state: TarotMatchState;
  
  beforeEach(() => {
    state = {
      turn: 1,
      currentPlayer: 'player1',
      players: {
        player1: {
          id: 'player1',
          name: 'Test Player 1',
          health: 30,
          fate: 0,
          hand: ['major_00', 'wands_01', 'cups_02'],
          deck: ['swords_03', 'pentacles_04'],
          discard: [],
          lanes: [{}, {}, {}, {}, {}, {}]
        },
        player2: {
          id: 'player2',
          name: 'Test Player 2',
          health: 30,
          fate: 0,
          hand: ['major_01', 'wands_02'],
          deck: ['cups_03', 'swords_04'],
          discard: [],
          lanes: [{}, {}, {}, {}, {}, {}]
        }
      },
      cardOrientations: {},
      spreadSlots: {
        past: null,
        present: null,
        future: null
      },
      arcanaTrials: {
        sun: 0,
        moon: 0,
        judgement: 0
      },
      majorArcanaCharge: {},
      channeling: {},
      reactionWindow: null,
      winner: null,
      status: 'active'
    };
  });

  describe('Orientation System', () => {
    it('should flip card orientation from upright to reversed', () => {
      state.cardOrientations['wands_01'] = 'upright';
      const newState = flipOrientation(state, 'wands_01');
      expect(newState.cardOrientations['wands_01']).toBe('reversed');
    });

    it('should flip card orientation from reversed to upright', () => {
      state.cardOrientations['wands_01'] = 'reversed';
      const newState = flipOrientation(state, 'wands_01');
      expect(newState.cardOrientations['wands_01']).toBe('upright');
    });

    it('should apply different effects based on orientation', () => {
      state.cardOrientations['wands_01'] = 'upright';
      const uprightDamage = calculateOrientationEffect('wands_01', 'upright', 5);
      
      state.cardOrientations['wands_01'] = 'reversed';
      const reversedDamage = calculateOrientationEffect('wands_01', 'reversed', 5);
      
      expect(uprightDamage).not.toBe(reversedDamage);
    });
  });

  describe('Fate System', () => {
    it('should generate fate at turn start', () => {
      const newState = generateFate(state, 'player1');
      expect(newState.players.player1.fate).toBe(1);
    });

    it('should generate bonus fate every 3 turns', () => {
      state.turn = 3;
      const newState = generateFate(state, 'player1');
      expect(newState.players.player1.fate).toBe(2); // 1 base + 1 bonus
    });

    it('should spend fate for peek action', () => {
      state.players.player1.fate = 3;
      state.reactionWindow = { open: true, responded: {} };
      const newState = peekTopCards(state, 'player1');
      expect(newState.players.player1.fate).toBe(2); // 3 - 1
    });

    it('should require 2 fate for force draw action', () => {
      state.players.player1.fate = 2;
      state.reactionWindow = { open: true, responded: {} };
      const newState = forceOpponentDraw(state, 'player1', 'player2');
      expect(newState.players.player1.fate).toBe(0); // 2 - 2
      expect(newState.players.player2.hand.length).toBe(3); // 2 + 1
    });

    it('should require 3 fate for divine intervention', () => {
      state.players.player1.fate = 3;
      state.reactionWindow = { open: true, responded: {} };
      const newState = divineIntervention(state, 'player1');
      expect(newState.players.player1.fate).toBe(0); // 3 - 3
      expect(newState.reactionWindow?.open).toBe(false);
    });

    it('should not allow fate actions outside reaction window', () => {
      state.players.player1.fate = 3;
      state.reactionWindow = null;
      const newState = peekTopCards(state, 'player1');
      expect(newState).toBe(state); // No change
    });

    it('should not allow duplicate fate actions in same window', () => {
      state.players.player1.fate = 3;
      state.reactionWindow = { open: true, responded: { player1: true } };
      const newState = peekTopCards(state, 'player1');
      expect(newState).toBe(state); // No change
    });
  });

  describe('Spread Mechanics', () => {
    it('should place cards in spread slots', () => {
      const newState = placeInSpread(state, 'wands_01', 'past');
      expect(newState.spreadSlots.past).toBe('wands_01');
    });

    it('should apply Past slot bonus on turns 1-3', () => {
      state.turn = 2;
      state.spreadSlots.past = 'wands_01';
      const bonus = applySpreadBonus(state, 'past');
      expect(bonus).toBeGreaterThan(0);
    });

    it('should apply Present slot bonus on turns 4-6', () => {
      state.turn = 5;
      state.spreadSlots.present = 'cups_02';
      const bonus = applySpreadBonus(state, 'present');
      expect(bonus).toBeGreaterThan(0);
    });

    it('should apply Future slot bonus on turns 7+', () => {
      state.turn = 8;
      state.spreadSlots.future = 'swords_03';
      const bonus = applySpreadBonus(state, 'future');
      expect(bonus).toBeGreaterThan(0);
    });

    it('should not apply bonus outside turn range', () => {
      state.turn = 5;
      state.spreadSlots.past = 'wands_01';
      const bonus = applySpreadBonus(state, 'past');
      expect(bonus).toBe(0);
    });
  });

  describe('Arcana Trials', () => {
    it('should charge Sun trial with fire damage', () => {
      state.arcanaTrials.sun = 50;
      const newState = chargeTrial(state, 'sun', 25);
      expect(newState.arcanaTrials.sun).toBe(75);
    });

    it('should charge Moon trial with water healing', () => {
      state.arcanaTrials.moon = 30;
      const newState = chargeTrial(state, 'moon', 40);
      expect(newState.arcanaTrials.moon).toBe(70);
    });

    it('should charge Judgement trial with control effects', () => {
      state.arcanaTrials.judgement = 60;
      const newState = chargeTrial(state, 'judgement', 20);
      expect(newState.arcanaTrials.judgement).toBe(80);
    });

    it('should cap trials at 100', () => {
      state.arcanaTrials.sun = 90;
      const newState = chargeTrial(state, 'sun', 20);
      expect(newState.arcanaTrials.sun).toBe(100);
    });

    it('should detect victory with 3 completed trials', () => {
      state.arcanaTrials = {
        sun: 100,
        moon: 100,
        judgement: 100
      };
      const victory = checkTrialsVictory(state);
      expect(victory).toBe(true);
    });

    it('should not detect victory with 2 completed trials', () => {
      state.arcanaTrials = {
        sun: 100,
        moon: 100,
        judgement: 80
      };
      const victory = checkTrialsVictory(state);
      expect(victory).toBe(false);
    });
  });

  describe('Major Arcana Charging', () => {
    it('should charge 10 per Major Arcana play', () => {
      state.majorArcanaCharge['player1'] = 0;
      const newState = chargeMajorArcana(state, 'player1', 'major_00');
      expect(newState.majorArcanaCharge['player1']).toBe(10);
    });

    it('should activate ultimate at 100 charge', () => {
      state.majorArcanaCharge['player1'] = 100;
      const newState = activateMajorUltimate(state, 'player1', 'major_00');
      expect(newState.majorArcanaCharge['player1']).toBe(0);
      // Ultimate effect should be applied
    });

    it('should not charge for non-Major Arcana', () => {
      state.majorArcanaCharge['player1'] = 0;
      const newState = chargeMajorArcana(state, 'player1', 'wands_01');
      expect(newState.majorArcanaCharge['player1']).toBe(0);
    });

    it('should cap charge at 100', () => {
      state.majorArcanaCharge['player1'] = 95;
      const newState = chargeMajorArcana(state, 'player1', 'major_00');
      expect(newState.majorArcanaCharge['player1']).toBe(100);
    });
  });

  describe('Suit Combat Styles', () => {
    it('should apply Wands burn effect', () => {
      const effect = applySuitEffect(state, 'wands', 'player2');
      expect(effect.type).toBe('burn');
      expect(effect.duration).toBe(3);
    });

    it('should apply Cups healing effect', () => {
      state.players.player1.health = 20;
      const newState = applySuitEffect(state, 'cups', 'player1');
      expect(newState.players.player1.health).toBeGreaterThan(20);
    });

    it('should apply Swords counter effect', () => {
      const effect = applySuitEffect(state, 'swords', 'player1');
      expect(effect.type).toBe('counter');
      expect(effect.active).toBe(true);
    });

    it('should apply Pentacles shield effect', () => {
      const effect = applySuitEffect(state, 'pentacles', 'player1');
      expect(effect.type).toBe('shield');
      expect(effect.value).toBeGreaterThan(0);
    });
  });

  describe('Elemental Interactions', () => {
    it('should deal bonus damage with Fire vs Air', () => {
      const baseDamage = 5;
      const damage = calculateElementalDamage('fire', 'air', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 1.5));
    });

    it('should deal reduced damage with Fire vs Water', () => {
      const baseDamage = 10;
      const damage = calculateElementalDamage('fire', 'water', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 0.5));
    });

    it('should deal bonus damage with Water vs Fire', () => {
      const baseDamage = 8;
      const damage = calculateElementalDamage('water', 'fire', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 1.5));
    });

    it('should deal reduced damage with Water vs Earth', () => {
      const baseDamage = 6;
      const damage = calculateElementalDamage('water', 'earth', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 0.5));
    });

    it('should deal bonus damage with Air vs Earth', () => {
      const baseDamage = 7;
      const damage = calculateElementalDamage('air', 'earth', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 1.5));
    });

    it('should deal bonus damage with Earth vs Water', () => {
      const baseDamage = 9;
      const damage = calculateElementalDamage('earth', 'water', baseDamage);
      expect(damage).toBe(Math.floor(baseDamage * 1.5));
    });

    it('should deal normal damage with same elements', () => {
      const baseDamage = 5;
      const damage = calculateElementalDamage('fire', 'fire', baseDamage);
      expect(damage).toBe(baseDamage);
    });
  });

  describe('Channeling System', () => {
    it('should allow channeling multiple cards per turn', () => {
      const newState = applyChanneling(state, 'player1', ['wands_01', 'cups_02']);
      expect(newState.channeling['player1']).toEqual(['wands_01', 'cups_02']);
    });

    it('should boost next card with channeled cards', () => {
      state.channeling['player1'] = ['wands_01', 'cups_02'];
      const boost = calculateChannelBoost(state, 'player1');
      expect(boost).toBe(2); // +1 per channeled card
    });

    it('should clear channeling after use', () => {
      state.channeling['player1'] = ['wands_01'];
      const newState = useChanneling(state, 'player1');
      expect(newState.channeling['player1']).toEqual([]);
    });
  });
});

// Helper functions for testing
function calculateOrientationEffect(cardId: string, orientation: CardOrientation, basePower: number): number {
  return orientation === 'upright' ? basePower : Math.floor(basePower * 0.7);
}

function placeInSpread(state: TarotMatchState, cardId: string, slot: SpreadSlot): TarotMatchState {
  return {
    ...state,
    spreadSlots: {
      ...state.spreadSlots,
      [slot]: cardId
    }
  };
}

function chargeTrial(state: TarotMatchState, trial: 'sun' | 'moon' | 'judgement', amount: number): TarotMatchState {
  return {
    ...state,
    arcanaTrials: {
      ...state.arcanaTrials,
      [trial]: Math.min(100, state.arcanaTrials[trial] + amount)
    }
  };
}

function calculateChannelBoost(state: TarotMatchState, playerId: string): number {
  return state.channeling[playerId]?.length || 0;
}

function useChanneling(state: TarotMatchState, playerId: string): TarotMatchState {
  return {
    ...state,
    channeling: {
      ...state.channeling,
      [playerId]: []
    }
  };
}