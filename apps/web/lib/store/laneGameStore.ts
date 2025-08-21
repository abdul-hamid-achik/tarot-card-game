import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { AnimationQueue } from '@/lib/animation/AnimationQueue';
import { gameLogger } from '@tarot/game-logger';

// Re-export types from game-sim
export type { Unit, PlayerState, CombatPair, Keyword } from '@tarot/game-sim/src/types';
import type { Unit, PlayerState, CombatPair, MatchState as SimMatchState } from '@tarot/game-sim/src/types';

// Extended types for UI
export interface Card {
  id: string;
  name: string;
  cost: number;
  attack?: number;
  health?: number;
  type: 'unit' | 'spell' | 'burst' | 'fast' | 'slow';
  keywords?: string[];
  description: string;
  imageUrl?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'champion';
}

export interface LaneMatchState extends SimMatchState {
  type?: 'pvp' | 'pve' | 'tutorial';
  turnTimer?: number;
  animations?: AnimationQueue;
}

interface LaneGameStore {
  // Match State
  currentMatch: LaneMatchState | null;
  isSearchingMatch: boolean;
  
  // UI State
  selectedUnit: Unit | null;
  hoveredCard: Card | null;
  draggedCard: Card | null;
  validLanes: number[]; // Which lanes can receive a drop
  selectedAttackers: string[]; // Unit IDs selected for attack
  blockAssignments: Map<string, string>; // attackerId -> blockerId
  
  // Animation
  animationQueue: AnimationQueue;
  
  // Actions - UI
  setCurrentMatch: (match: LaneMatchState) => void;
  setSelectedUnit: (unit: Unit | null) => void;
  setHoveredCard: (card: Card | null) => void;
  setDraggedCard: (card: Card | null) => void;
  setValidLanes: (lanes: number[]) => void;
  toggleAttacker: (unitId: string) => void;
  assignBlocker: (attackerId: string, blockerId: string) => void;
  
  // Actions - Game
  playCard: (cardId: string, lane?: number) => Promise<void>;
  declareAttack: () => Promise<void>;
  declareBlock: () => Promise<void>;
  pass: () => Promise<void>;
  endTurn: () => Promise<void>;
  
  // Match Management
  initializeMatch: (matchData: Partial<LaneMatchState>) => void;
  updateMatch: (updates: Partial<LaneMatchState>) => void;
  setSearchingMatch: (searching: boolean) => void;
  
  // Helpers
  getPlayerState: (playerId: string) => PlayerState | null;
  getOpponentState: () => PlayerState | null;
  canPlayCard: (card: Card) => boolean;
  canAttack: (unit: Unit) => boolean;
  canBlock: (attacker: string, blocker: Unit) => boolean;
}

export const useLaneGameStore = create<LaneGameStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      currentMatch: null,
      isSearchingMatch: false,
      selectedUnit: null,
      hoveredCard: null,
      draggedCard: null,
      validLanes: [],
      selectedAttackers: [],
      blockAssignments: new Map(),
      animationQueue: new AnimationQueue(),
      
      // UI Actions
      setCurrentMatch: (match) => {
        gameLogger.setContext({
          matchId: match.matchId,
          turn: match.turn,
          phase: match.phase
        });
        set({ currentMatch: match });
      },
      
      setSelectedUnit: (unit) => set({ selectedUnit: unit }),
      setHoveredCard: (card) => set({ hoveredCard: card }),
      setDraggedCard: (card) => set({ draggedCard: card }),
      setValidLanes: (lanes) => set({ validLanes: lanes }),
      
      toggleAttacker: (unitId) => {
        const state = get();
        const attackers = [...state.selectedAttackers];
        const index = attackers.indexOf(unitId);
        
        if (index >= 0) {
          attackers.splice(index, 1);
        } else {
          attackers.push(unitId);
        }
        
        set({ selectedAttackers: attackers });
      },
      
      assignBlocker: (attackerId, blockerId) => {
        const state = get();
        const assignments = new Map(state.blockAssignments);
        assignments.set(attackerId, blockerId);
        set({ blockAssignments: assignments });
      },
      
      // Game Actions
      playCard: async (cardId, lane) => {
        const state = get();
        if (!state.currentMatch) return;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        
        // Add card play animation
        state.animationQueue.add({
          id: `play-${cardId}`,
          type: 'card-play',
          duration: 500,
          source: `[data-card="${cardId}"]`,
          target: lane !== undefined ? `[data-lane="${lane}"]` : undefined
        });
        
        // Call API to play card
        try {
          const response = await fetch('/api/match/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: state.currentMatch.matchId,
              action: {
                type: 'play_card',
                playerId,
                cardId,
                lane
              }
            })
          });
          
          if (response.ok) {
            const updatedMatch = await response.json();
            set({ currentMatch: updatedMatch });
            
            gameLogger.logAction('play_card', { cardId, lane }, true);
          }
        } catch (error) {
          gameLogger.logAction('play_card', { cardId, lane }, false, String(error));
        }
      },
      
      declareAttack: async () => {
        const state = get();
        if (!state.currentMatch || state.selectedAttackers.length === 0) return;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        
        // Add attack animations
        for (const attackerId of state.selectedAttackers) {
          state.animationQueue.add({
            id: `attack-${attackerId}`,
            type: 'unit-attack',
            duration: 300,
            source: `[data-unit="${attackerId}"]`
          });
        }
        
        try {
          const response = await fetch('/api/match/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: state.currentMatch.matchId,
              action: {
                type: 'declare_attackers',
                playerId,
                attackerIds: state.selectedAttackers
              }
            })
          });
          
          if (response.ok) {
            const updatedMatch = await response.json();
            set({ 
              currentMatch: updatedMatch,
              selectedAttackers: []
            });
            
            gameLogger.logCombatStart();
          }
        } catch (error) {
          gameLogger.logAction('declare_attack', { attackers: state.selectedAttackers }, false, String(error));
        }
      },
      
      declareBlock: async () => {
        const state = get();
        if (!state.currentMatch || state.blockAssignments.size === 0) return;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        const assignments = Array.from(state.blockAssignments.entries()).map(([attackerId, blockerId]) => ({
          attackerId,
          blockerId
        }));
        
        // Add block animations
        for (const [attackerId, blockerId] of state.blockAssignments) {
          state.animationQueue.add({
            id: `block-${blockerId}`,
            type: 'unit-block',
            duration: 300,
            source: `[data-unit="${blockerId}"]`,
            target: `[data-unit="${attackerId}"]`
          });
        }
        
        try {
          const response = await fetch('/api/match/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: state.currentMatch.matchId,
              action: {
                type: 'declare_blockers',
                playerId,
                blockAssignments: assignments
              }
            })
          });
          
          if (response.ok) {
            const updatedMatch = await response.json();
            set({ 
              currentMatch: updatedMatch,
              blockAssignments: new Map()
            });
          }
        } catch (error) {
          gameLogger.logAction('declare_block', { assignments }, false, String(error));
        }
      },
      
      pass: async () => {
        const state = get();
        if (!state.currentMatch) return;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        
        try {
          const response = await fetch('/api/match/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: state.currentMatch.matchId,
              action: {
                type: 'pass',
                playerId
              }
            })
          });
          
          if (response.ok) {
            const updatedMatch = await response.json();
            set({ currentMatch: updatedMatch });
          }
        } catch (error) {
          gameLogger.logAction('pass', {}, false, String(error));
        }
      },
      
      endTurn: async () => {
        const state = get();
        if (!state.currentMatch) return;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        
        // Add turn end animation
        state.animationQueue.add({
          id: 'turn-end',
          type: 'turn-end',
          duration: 1000
        });
        
        try {
          const response = await fetch('/api/match/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: state.currentMatch.matchId,
              action: {
                type: 'end_turn',
                playerId
              }
            })
          });
          
          if (response.ok) {
            const updatedMatch = await response.json();
            
            // Add turn start animation
            state.animationQueue.add({
              id: 'turn-start',
              type: 'turn-start',
              duration: 1000
            });
            
            set({ currentMatch: updatedMatch });
            gameLogger.logTurnEnd();
          }
        } catch (error) {
          gameLogger.logAction('end_turn', {}, false, String(error));
        }
      },
      
      // Match Management
      initializeMatch: (matchData) => {
        const match = {
          ...matchData,
          animations: new AnimationQueue()
        } as LaneMatchState;
        
        set({ currentMatch: match });
      },
      
      updateMatch: (updates) => {
        set((state) => ({
          currentMatch: state.currentMatch ? { ...state.currentMatch, ...updates } : null
        }));
      },
      
      setSearchingMatch: (searching) => set({ isSearchingMatch: searching }),
      
      // Helpers
      getPlayerState: (playerId) => {
        const state = get();
        return state.currentMatch?.playerStates[playerId] || null;
      },
      
      getOpponentState: () => {
        const state = get();
        if (!state.currentMatch) return null;
        
        // TODO: Get actual player ID
        const playerId = 'player1';
        const opponentId = state.currentMatch.players.find(p => p !== playerId);
        
        return opponentId ? state.currentMatch.playerStates[opponentId] : null;
      },
      
      canPlayCard: (card) => {
        const state = get();
        if (!state.currentMatch) return false;
        
        const playerId = 'player1'; // TODO: Get actual player ID
        const playerState = state.currentMatch.playerStates[playerId];
        if (!playerState) return false;
        
        // Check mana
        const totalMana = playerState.mana + (card.type === 'spell' ? playerState.spellMana : 0);
        return card.cost <= totalMana;
      },
      
      canAttack: (unit) => {
        return unit.canAttack && !unit.hasAttacked;
      },
      
      canBlock: (attackerId, blocker) => {
        const state = get();
        if (!state.currentMatch?.combatPairs) return false;
        
        // Check if attacker exists in combat
        const combatPair = state.currentMatch.combatPairs.find(p => p.attackerId === attackerId);
        if (!combatPair) return false;
        
        // Check if already blocked
        if (combatPair.blockerId) return false;
        
        // Check if blocker is already blocking
        if (blocker.isBlocking) return false;
        
        // TODO: Check keyword restrictions (Elusive, Fearsome, etc.)
        
        return true;
      }
    }))
  )
);