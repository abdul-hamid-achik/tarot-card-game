import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchState } from '../src/types';
import { applyIntent, createInitialState, checkVictory } from '../src/sim';

describe('Full Match Integration Tests', () => {
  describe('Complete PvP Match', () => {
    it('should simulate a full match from start to victory', () => {
      const match = simulateFullMatch({
        player1: {
          id: 'p1',
          name: 'Alice',
          deck: generateTestDeck('classic')
        },
        player2: {
          id: 'p2',
          name: 'Bob',
          deck: generateTestDeck('marigold')
        }
      });

      // Match should start correctly
      expect(match.state.status).toBe('active');
      expect(match.state.players.p1.health).toBe(30);
      expect(match.state.players.p2.health).toBe(30);
      expect(match.state.turn).toBe(1);

      // Simulate turns until victory
      let turns = 0;
      const maxTurns = 50;
      
      while (match.state.status === 'active' && turns < maxTurns) {
        match.playTurn();
        turns++;
      }

      // Match should end
      expect(match.state.status).toBe('completed');
      expect(match.state.winner).toBeTruthy();
      
      // Victory condition should be met
      const winner = match.state.winner;
      if (winner) {
        const winnerState = match.state.players[winner];
        const loserState = match.state.players[winner === 'p1' ? 'p2' : 'p1'];
        
        // Check possible victory conditions
        const healthVictory = loserState.health <= 0;
        const trialsVictory = Object.values(match.state.arcanaTrials).filter(v => v >= 100).length >= 3;
        const deckoutVictory = loserState.deck.length === 0 && loserState.hand.length === 0;
        
        expect(healthVictory || trialsVictory || deckoutVictory).toBe(true);
      }
    });

    it('should handle reaction windows correctly', () => {
      const match = createTestMatch();
      
      // Play a card that triggers reaction window
      match.playCard('p1', 'major_00', 0);
      
      if (match.state.reactionWindow?.open) {
        // Player 2 should be able to respond with fate action
        if (match.state.players.p2.fate >= 1) {
          match.useFateAction('p2', 'flip_orientation', { cardId: 'major_00' });
          expect(match.state.cardOrientations['major_00']).toBe('reversed');
        }
      }
    });

    it('should progress through turn phases correctly', () => {
      const match = createTestMatch();
      const initialTurn = match.state.turn;
      
      // Draw phase
      match.drawPhase();
      expect(match.state.players[match.state.currentPlayer].hand.length).toBeGreaterThan(0);
      
      // Main phase - play cards
      const hand = match.state.players[match.state.currentPlayer].hand;
      if (hand.length > 0) {
        match.playCard(match.state.currentPlayer, hand[0], 0);
      }
      
      // Combat phase
      match.combatPhase();
      
      // End phase
      match.endTurn();
      expect(match.state.turn).toBe(initialTurn + 1);
      expect(match.state.currentPlayer).toBe(initialTurn === 1 ? 'p2' : 'p1');
    });
  });

  describe('Deck Archetypes', () => {
    it('should test Wands aggro deck strategy', () => {
      const match = createTestMatch({
        p1Deck: generateWandsAggroDeck(),
        p2Deck: generateTestDeck('classic')
      });

      // Wands deck should deal burn damage
      simulateTurns(match, 5);
      
      // Check for burn effects
      const burnEffects = match.state.effects?.filter(e => e.type === 'burn') || [];
      expect(burnEffects.length).toBeGreaterThan(0);
    });

    it('should test Cups control deck strategy', () => {
      const match = createTestMatch({
        p1Deck: generateCupsControlDeck(),
        p2Deck: generateTestDeck('classic')
      });

      // Cups deck should heal and control
      simulateTurns(match, 5);
      
      // Player 1 should have healed
      const healingDone = match.history.filter(h => h.type === 'heal' && h.target === 'p1');
      expect(healingDone.length).toBeGreaterThan(0);
    });

    it('should test Swords counter deck strategy', () => {
      const match = createTestMatch({
        p1Deck: generateSwordsCounterDeck(),
        p2Deck: generateTestDeck('classic')
      });

      simulateTurns(match, 5);
      
      // Check for counter effects
      const counterEffects = match.state.effects?.filter(e => e.type === 'counter') || [];
      expect(counterEffects.length).toBeGreaterThan(0);
    });

    it('should test Pentacles defense deck strategy', () => {
      const match = createTestMatch({
        p1Deck: generatePentaclesDefenseDeck(),
        p2Deck: generateTestDeck('classic')
      });

      simulateTurns(match, 5);
      
      // Check for shield effects
      const shieldEffects = match.state.effects?.filter(e => e.type === 'shield') || [];
      expect(shieldEffects.length).toBeGreaterThan(0);
    });

    it('should test Major Arcana ultimate deck', () => {
      const match = createTestMatch({
        p1Deck: generateMajorArcanaDeck(),
        p2Deck: generateTestDeck('classic')
      });

      // Play Major Arcana to charge ultimate
      for (let i = 0; i < 10; i++) {
        if (match.state.status !== 'active') break;
        
        const majorCards = match.state.players.p1.hand.filter(c => c.startsWith('major_'));
        if (majorCards.length > 0) {
          match.playCard('p1', majorCards[0], 0);
        }
        match.endTurn();
      }

      // Should have charged ultimate
      expect(match.state.majorArcanaCharge['p1']).toBeGreaterThan(0);
    });
  });

  describe('Victory Conditions', () => {
    it('should achieve victory by reducing opponent health to 0', () => {
      const match = createTestMatch();
      
      // Direct damage to opponent
      match.state.players.p2.health = 5;
      match.dealDamage('p2', 5);
      
      expect(match.state.status).toBe('completed');
      expect(match.state.winner).toBe('p1');
    });

    it('should achieve victory by completing 3 Arcana Trials', () => {
      const match = createTestMatch();
      
      // Complete all trials
      match.state.arcanaTrials = {
        sun: 100,
        moon: 100,
        judgement: 100
      };
      
      match.checkVictoryConditions();
      
      expect(match.state.status).toBe('completed');
      expect(match.state.winner).toBeTruthy();
    });

    it('should achieve victory by opponent deck-out', () => {
      const match = createTestMatch();
      
      // Empty opponent's deck and hand
      match.state.players.p2.deck = [];
      match.state.players.p2.hand = [];
      
      match.checkVictoryConditions();
      
      expect(match.state.status).toBe('completed');
      expect(match.state.winner).toBe('p1');
    });
  });

  describe('Complex Interactions', () => {
    it('should handle orientation flips during combat', () => {
      const match = createTestMatch();
      
      // Play a card
      match.playCard('p1', 'wands_01', 0);
      match.state.cardOrientations['wands_01'] = 'upright';
      
      // Opponent flips it during reaction
      match.state.reactionWindow = { open: true, responded: {} };
      match.state.players.p2.fate = 1;
      match.useFateAction('p2', 'flip_orientation', { cardId: 'wands_01' });
      
      expect(match.state.cardOrientations['wands_01']).toBe('reversed');
      
      // Combat should use reversed values
      const damage = match.calculateCardDamage('wands_01');
      expect(damage).toBeLessThan(5); // Reversed reduces power
    });

    it('should handle spread bonuses across turns', () => {
      const match = createTestMatch();
      
      // Place cards in spread
      match.state.spreadSlots.past = 'major_00';
      match.state.spreadSlots.present = 'major_01';
      match.state.spreadSlots.future = 'major_21';
      
      // Turn 1-3: Past bonus
      match.state.turn = 2;
      const pastBonus = match.getSpreadBonus();
      expect(pastBonus).toBeGreaterThan(0);
      
      // Turn 4-6: Present bonus
      match.state.turn = 5;
      const presentBonus = match.getSpreadBonus();
      expect(presentBonus).toBeGreaterThan(0);
      
      // Turn 7+: Future bonus
      match.state.turn = 8;
      const futureBonus = match.getSpreadBonus();
      expect(futureBonus).toBeGreaterThan(0);
    });

    it('should handle elemental chains correctly', () => {
      const match = createTestMatch();
      
      // Play Fire card
      match.playCard('p1', 'wands_01', 0); // Fire
      
      // Play Water card (strong vs Fire)
      match.playCard('p2', 'cups_01', 0); // Water
      
      // Water should deal bonus damage to Fire
      const damage = match.calculateElementalDamage('cups_01', 'wands_01');
      expect(damage).toBeGreaterThan(5); // Base damage with bonus
    });

    it('should handle channeling combos', () => {
      const match = createTestMatch();
      
      // Channel multiple cards
      match.channelCard('p1', 'wands_01');
      match.channelCard('p1', 'wands_02');
      
      expect(match.state.channeling['p1']).toHaveLength(2);
      
      // Play a card with channeling boost
      match.playCard('p1', 'major_00', 0);
      
      // Channeling should be consumed
      expect(match.state.channeling['p1']).toHaveLength(0);
    });
  });
});

// Helper functions
function generateTestDeck(archetype: string): string[] {
  const decks: Record<string, string[]> = {
    classic: [
      'major_00', 'major_01',
      ...Array.from({ length: 7 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`)
    ],
    marigold: [
      'major_02', 'major_03',
      ...Array.from({ length: 7 }, (_, i) => `wands_${String(i + 8).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `cups_${String(i + 8).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `swords_${String(i + 8).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `pentacles_${String(i + 8).padStart(2, '0')}`)
    ]
  };
  
  return decks[archetype] || decks.classic;
}

function generateWandsAggroDeck(): string[] {
  return [
    'major_00', 'major_16', // The Fool, The Tower
    ...Array.from({ length: 14 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 14 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`) // Doubles
  ];
}

function generateCupsControlDeck(): string[] {
  return [
    'major_02', 'major_18', // The High Priestess, The Moon
    ...Array.from({ length: 14 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 14 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`)
  ];
}

function generateSwordsCounterDeck(): string[] {
  return [
    'major_01', 'major_11', // The Magician, Justice
    ...Array.from({ length: 14 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 14 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`)
  ];
}

function generatePentaclesDefenseDeck(): string[] {
  return [
    'major_04', 'major_09', // The Emperor, The Hermit
    ...Array.from({ length: 14 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 14 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`)
  ];
}

function generateMajorArcanaDeck(): string[] {
  return [
    'major_00', 'major_21', // The Fool, The World
    ...Array.from({ length: 7 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`)
  ];
}

function createTestMatch(config?: any): any {
  // Mock match object with necessary methods
  return {
    state: createInitialTestState(),
    history: [],
    playCard: jest.fn(),
    useFateAction: jest.fn(),
    drawPhase: jest.fn(),
    combatPhase: jest.fn(),
    endTurn: jest.fn(),
    dealDamage: jest.fn(),
    checkVictoryConditions: jest.fn(),
    calculateCardDamage: jest.fn(),
    getSpreadBonus: jest.fn(),
    calculateElementalDamage: jest.fn(),
    channelCard: jest.fn(),
    playTurn: jest.fn(),
    ...config
  };
}

function createInitialTestState(): TarotMatchState {
  return {
    turn: 1,
    currentPlayer: 'p1',
    players: {
      p1: {
        id: 'p1',
        name: 'Player 1',
        health: 30,
        fate: 0,
        hand: [],
        deck: generateTestDeck('classic'),
        discard: [],
        lanes: [{}, {}, {}, {}, {}, {}]
      },
      p2: {
        id: 'p2',
        name: 'Player 2',
        health: 30,
        fate: 0,
        hand: [],
        deck: generateTestDeck('marigold'),
        discard: [],
        lanes: [{}, {}, {}, {}, {}, {}]
      }
    },
    cardOrientations: {},
    spreadSlots: { past: null, present: null, future: null },
    arcanaTrials: { sun: 0, moon: 0, judgement: 0 },
    majorArcanaCharge: {},
    channeling: {},
    reactionWindow: null,
    winner: null,
    status: 'active'
  };
}

function simulateTurns(match: any, turns: number): void {
  for (let i = 0; i < turns; i++) {
    if (match.state.status !== 'active') break;
    match.playTurn();
  }
}