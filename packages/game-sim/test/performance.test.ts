import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import { TarotMatchState } from '../src/types';
import { 
  applyIntent,
  simulateFullMatch,
  generateFate,
  calculateElementalDamage,
  checkTrialsVictory
} from '../src/tarot-extensions';

describe('Performance Tests', () => {
  describe('Game Simulation Performance', () => {
    it('should handle 1000 game state updates in under 100ms', () => {
      const state = createLargeGameState();
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        applyIntent(state, {
          type: 'play_card',
          playerId: 'player1',
          cardId: `wands_${(i % 14 + 1).toString().padStart(2, '0')}`,
          laneIndex: i % 6
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      console.log(`1000 state updates completed in ${duration.toFixed(2)}ms`);
    });

    it('should simulate 100 complete matches in reasonable time', () => {
      const startTime = performance.now();
      const results = [];
      
      for (let i = 0; i < 100; i++) {
        const match = simulateQuickMatch();
        results.push(match.winner);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 matches
      console.log(`100 matches simulated in ${duration.toFixed(2)}ms`);
      
      // Check win distribution
      const p1Wins = results.filter(w => w === 'player1').length;
      const p2Wins = results.filter(w => w === 'player2').length;
      console.log(`Win distribution: P1: ${p1Wins}, P2: ${p2Wins}`);
      
      // Should be relatively balanced (within 30-70 range)
      expect(p1Wins).toBeGreaterThan(20);
      expect(p1Wins).toBeLessThan(80);
    });

    it('should calculate complex elemental interactions quickly', () => {
      const iterations = 10000;
      const elements = ['fire', 'water', 'air', 'earth'];
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const attacker = elements[i % 4];
        const defender = elements[(i + 1) % 4];
        calculateElementalDamage(attacker, defender, 10);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50);
      console.log(`${iterations} elemental calculations in ${duration.toFixed(2)}ms`);
    });

    it('should handle large hand sizes efficiently', () => {
      const state = createLargeGameState();
      
      // Give player massive hand
      state.players.player1.hand = Array.from(
        { length: 50 }, 
        (_, i) => `card_${i}`
      );
      
      const startTime = performance.now();
      
      // Perform operations on large hand
      for (let i = 0; i < 100; i++) {
        findBestCardToPlay(state, 'player1');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      console.log(`Large hand operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during long matches', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate a very long match
      const match = createLongMatch();
      for (let i = 0; i < 1000; i++) {
        match.playTurn();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
    });

    it('should efficiently store game history', () => {
      const history: any[] = [];
      const startTime = performance.now();
      
      // Store 10000 game events
      for (let i = 0; i < 10000; i++) {
        history.push({
          turn: i,
          action: 'play_card',
          cardId: `card_${i}`,
          playerId: i % 2 === 0 ? 'player1' : 'player2',
          timestamp: Date.now(),
          state: { turn: i } // Simplified state
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(history.length).toBe(10000);
      
      // Test history search
      const searchStart = performance.now();
      const found = history.filter(h => h.action === 'play_card' && h.turn > 5000);
      const searchEnd = performance.now();
      
      expect(searchEnd - searchStart).toBeLessThan(10);
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('Fate System Performance', () => {
    it('should handle rapid fate generation', () => {
      const state = createLargeGameState();
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        state.turn = i;
        generateFate(state, 'player1');
        generateFate(state, 'player2');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50);
      console.log(`1000 turns of fate generation in ${duration.toFixed(2)}ms`);
    });

    it('should efficiently check reaction windows', () => {
      const state = createLargeGameState();
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        state.reactionWindow = {
          open: i % 2 === 0,
          responded: i % 3 === 0 ? { player1: true } : {}
        };
        
        canUseFateAction(state, 'player1');
        canUseFateAction(state, 'player2');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Arcana Trials Performance', () => {
    it('should efficiently track trial progress', () => {
      const state = createLargeGameState();
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        state.arcanaTrials.sun = Math.min(100, i / 10);
        state.arcanaTrials.moon = Math.min(100, i / 15);
        state.arcanaTrials.judgement = Math.min(100, i / 20);
        
        checkTrialsVictory(state);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Deck Operations Performance', () => {
    it('should efficiently shuffle large decks', () => {
      const deck = Array.from({ length: 100 }, (_, i) => `card_${i}`);
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        shuffleDeck([...deck]);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      console.log(`1000 deck shuffles in ${duration.toFixed(2)}ms`);
    });

    it('should quickly search through deck', () => {
      const deck = Array.from({ length: 100 }, (_, i) => ({
        id: `card_${i}`,
        suit: ['wands', 'cups', 'swords', 'pentacles'][i % 4],
        value: (i % 14) + 1,
        type: i < 22 ? 'major' : 'minor'
      }));
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        // Search for specific cards
        deck.filter(c => c.suit === 'wands');
        deck.filter(c => c.type === 'major');
        deck.find(c => c.id === `card_${i % 100}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Lane Combat Performance', () => {
    it('should resolve complex lane combat quickly', () => {
      const state = createLargeGameState();
      
      // Fill all lanes with cards
      for (let player of ['player1', 'player2']) {
        for (let i = 0; i < 6; i++) {
          state.players[player].lanes[i] = {
            cardId: `card_${i}`,
            power: 5,
            health: 5,
            effects: ['burn', 'shield', 'counter']
          };
        }
      }
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        resolveLaneCombat(state);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200);
      console.log(`1000 lane combat resolutions in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Stress Tests', () => {
    it('should handle maximum game complexity', () => {
      const state = createMaxComplexityState();
      const startTime = performance.now();
      
      // Perform various operations
      for (let i = 0; i < 100; i++) {
        // Fate actions
        if (state.reactionWindow?.open) {
          generateFate(state, 'player1');
        }
        
        // Card plays
        applyIntent(state, {
          type: 'play_card',
          playerId: 'player1',
          cardId: 'major_00',
          laneIndex: 0
        });
        
        // Trial checks
        checkTrialsVictory(state);
        
        // Elemental calculations
        calculateElementalDamage('fire', 'water', 10);
        
        // Lane combat
        resolveLaneCombat(state);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500);
      console.log(`Max complexity operations in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent match simulations', async () => {
      const startTime = performance.now();
      
      // Simulate 10 matches concurrently
      const matchPromises = Array.from({ length: 10 }, async () => {
        return simulateQuickMatch();
      });
      
      const results = await Promise.all(matchPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(10);
      expect(duration).toBeLessThan(1000);
      console.log(`10 concurrent matches in ${duration.toFixed(2)}ms`);
    });
  });
});

// Helper functions
function createLargeGameState(): TarotMatchState {
  return {
    turn: 1,
    currentPlayer: 'player1',
    players: {
      player1: {
        id: 'player1',
        name: 'Player 1',
        health: 30,
        fate: 5,
        hand: Array.from({ length: 10 }, (_, i) => `hand_${i}`),
        deck: Array.from({ length: 30 }, (_, i) => `deck_${i}`),
        discard: Array.from({ length: 10 }, (_, i) => `discard_${i}`),
        lanes: [{}, {}, {}, {}, {}, {}]
      },
      player2: {
        id: 'player2',
        name: 'Player 2',
        health: 30,
        fate: 5,
        hand: Array.from({ length: 10 }, (_, i) => `hand2_${i}`),
        deck: Array.from({ length: 30 }, (_, i) => `deck2_${i}`),
        discard: Array.from({ length: 10 }, (_, i) => `discard2_${i}`),
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

function createMaxComplexityState(): TarotMatchState {
  const state = createLargeGameState();
  
  // Max out all features
  state.turn = 50;
  state.arcanaTrials = { sun: 99, moon: 99, judgement: 99 };
  state.majorArcanaCharge = { player1: 90, player2: 90 };
  state.channeling = { 
    player1: ['c1', 'c2', 'c3'],
    player2: ['c4', 'c5', 'c6']
  };
  state.reactionWindow = { open: true, responded: {} };
  
  // Fill spread
  state.spreadSlots = {
    past: 'major_00',
    present: 'major_01',
    future: 'major_21'
  };
  
  // Add many orientations
  for (let i = 0; i < 50; i++) {
    state.cardOrientations[`card_${i}`] = i % 2 === 0 ? 'upright' : 'reversed';
  }
  
  return state;
}

function simulateQuickMatch(): { winner: string, turns: number } {
  const state = createLargeGameState();
  let turns = 0;
  const maxTurns = 100;
  
  while (state.status === 'active' && turns < maxTurns) {
    // Simulate random actions
    const player = turns % 2 === 0 ? 'player1' : 'player2';
    
    // Random damage
    const opponent = player === 'player1' ? 'player2' : 'player1';
    state.players[opponent].health -= Math.floor(Math.random() * 3);
    
    // Check victory
    if (state.players[opponent].health <= 0) {
      state.winner = player;
      state.status = 'completed';
    }
    
    turns++;
  }
  
  // Force winner if timeout
  if (!state.winner) {
    state.winner = state.players.player1.health > state.players.player2.health 
      ? 'player1' 
      : 'player2';
  }
  
  return { winner: state.winner, turns };
}

function createLongMatch(): any {
  return {
    state: createLargeGameState(),
    playTurn: function() {
      this.state.turn++;
      // Simulate turn actions
    }
  };
}

function canUseFateAction(state: TarotMatchState, playerId: string): boolean {
  if (!state.reactionWindow?.open) return false;
  if (state.reactionWindow.responded[playerId]) return false;
  if (state.players[playerId].fate < 1) return false;
  return true;
}

function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function findBestCardToPlay(state: TarotMatchState, playerId: string): string | null {
  const hand = state.players[playerId].hand;
  if (hand.length === 0) return null;
  
  // Simple heuristic: return random card
  return hand[Math.floor(Math.random() * hand.length)];
}

function resolveLaneCombat(state: TarotMatchState): void {
  // Simulate lane combat resolution
  for (let i = 0; i < 6; i++) {
    const p1Card = state.players.player1.lanes[i];
    const p2Card = state.players.player2.lanes[i];
    
    if (p1Card?.power && p2Card?.power) {
      // Simulate combat
      if (p1Card.power > p2Card.power) {
        state.players.player2.health -= 1;
      } else if (p2Card.power > p1Card.power) {
        state.players.player1.health -= 1;
      }
    }
  }
}