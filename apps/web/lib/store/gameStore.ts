import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

export type CardOrientation = 'upright' | 'reversed';
export type GamePhase = 'draw' | 'main' | 'combat' | 'end';
export type CardSuit = 'wands' | 'cups' | 'swords' | 'pentacles' | 'major';

export interface Card {
  id: string;
  name: string;
  suit: CardSuit;
  number?: number;
  cost: number;
  attack?: number;
  health?: number;
  orientation: CardOrientation;
  description: string;
  reversedDescription?: string;
  imageUrl?: string;
  backImageUrl?: string;
  deck?: string; // Deck identifier for fetching correct card art
  type: 'unit' | 'spell' | 'major';
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
}

export interface BoardSlot {
  id?: string;
  card: Card | null;
  position?: number;
  isBlocked?: boolean;
}

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  fate: number;
  maxFate: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  board: BoardSlot[];
  trials: Trial[];
  avatar?: string;
  isAI?: boolean;
}

export interface Trial {
  id: string;
  name: string;
  description: string;
  requirement: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  reward?: string;
}

export interface MatchState {
  matchId: string;
  type?: 'pvp' | 'pve' | 'tutorial';
  turn: number;
  phase: GamePhase;
  activePlayer: string;
  players: Record<string, Player>;
  turnTimer?: number;
  reactionWindow?: {
    active: boolean;
    respondingPlayer?: string;
    timeRemaining?: number;
  };
  spreadCards?: {
    past?: Card;
    present?: Card;
    future?: Card;
  };
  lastAction?: {
    type: string;
    playerId: string;
    data: any;
  };
}

interface GameStore {
  // Match State
  currentMatch: MatchState | null;
  isConnected: boolean;
  isSearchingMatch: boolean;
  
  // UI State
  selectedCard: Card | null;
  hoveredCard: Card | null;
  draggedCard: Card | null;
  validDropZones: number[];
  showHandToggle: boolean;
  
  // Actions
  setCurrentMatch: (match: MatchState) => void;
  updateMatchState: (update: Partial<MatchState>) => void;
  setSelectedCard: (card: Card | null) => void;
  setHoveredCard: (card: Card | null) => void;
  setDraggedCard: (card: Card | null) => void;
  setValidDropZones: (zones: number[]) => void;
  toggleHand: () => void;
  
  // Game Actions
  playCard: (card: Card, targetSlot?: number, playerId?: string) => void;
  endTurn: () => void;
  flipCard: (cardId: string) => void;
  peekDestiny: () => void;
  forceDraw: () => void;
  initializeMatch: (matchData: Partial<MatchState>) => void;
  updateMatch: (updates: Partial<MatchState>) => void;
  
  // Connection
  connect: () => void;
  disconnect: () => void;
  setSearchingMatch: (searching: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      currentMatch: null,
      isConnected: false,
      isSearchingMatch: false,
      selectedCard: null,
      hoveredCard: null,
      draggedCard: null,
      validDropZones: [],
      showHandToggle: true,
      
      // Actions
      setCurrentMatch: (match) => set({ currentMatch: match }),
      updateMatchState: (update) => set((state) => ({
        currentMatch: state.currentMatch ? { ...state.currentMatch, ...update } : null
      })),
      setSelectedCard: (card) => set({ selectedCard: card }),
      setHoveredCard: (card) => set({ hoveredCard: card }),
      setDraggedCard: (card) => set({ draggedCard: card }),
      setValidDropZones: (zones) => set({ validDropZones: zones }),
      toggleHand: () => set((state) => ({ showHandToggle: !state.showHandToggle })),
      
      // Game Actions
      playCard: (card, targetSlot, playerId = 'player1') => {
        console.log('Playing card:', card, 'to slot:', targetSlot, 'for player:', playerId);
        const state = get();
        if (!state.currentMatch) return;
        
        const player = state.currentMatch.players[playerId];
        if (!player) return;
        
        // Remove card from hand
        const updatedHand = player.hand.filter(c => c.id !== card.id);
        
        // Add card to board if slot provided
        const updatedBoard = [...player.board];
        if (targetSlot !== undefined && targetSlot < updatedBoard.length) {
          updatedBoard[targetSlot] = { ...updatedBoard[targetSlot], card };
        }
        
        // Update fate
        const updatedFate = Math.max(0, player.fate - card.cost);
        
        // Update match state
        set({
          currentMatch: {
            ...state.currentMatch,
            players: {
              ...state.currentMatch.players,
              [playerId]: {
                ...player,
                hand: updatedHand,
                board: updatedBoard,
                fate: updatedFate
              }
            }
          }
        });
      },
      
      endTurn: () => {
        console.log('Ending turn');
        const state = get();
        if (!state.currentMatch) return;
        
        const playerIds = Object.keys(state.currentMatch.players);
        const currentIndex = playerIds.indexOf(state.currentMatch.activePlayer);
        const nextIndex = (currentIndex + 1) % playerIds.length;
        const nextPlayer = playerIds[nextIndex];
        
        set({
          currentMatch: {
            ...state.currentMatch,
            activePlayer: nextPlayer,
            turn: state.currentMatch.turn + 1,
            phase: 'draw'
          }
        });
      },
      
      flipCard: (cardId) => {
        console.log('Flipping card:', cardId);
        // WebSocket integration will go here
      },
      
      peekDestiny: () => {
        console.log('Peeking at destiny');
        // WebSocket integration will go here
      },
      
      forceDraw: () => {
        console.log('Forcing draw');
        // WebSocket integration will go here
      },
      
      initializeMatch: (matchData) => {
        set({ 
          currentMatch: {
            matchId: matchData.matchId || `match-${Date.now()}`,
            type: matchData.type || 'pvp',
            turn: 1,
            phase: 'draw',
            activePlayer: 'player1',
            players: {},
            ...matchData
          } as MatchState
        });
      },
      
      updateMatch: (updates) => {
        const state = get();
        if (!state.currentMatch) return;
        
        set({
          currentMatch: {
            ...state.currentMatch,
            ...updates
          }
        });
      },
      
      // Connection
      connect: () => set({ isConnected: true }),
      disconnect: () => set({ isConnected: false }),
      setSearchingMatch: (searching) => set({ isSearchingMatch: searching }),
    }))
  )
);