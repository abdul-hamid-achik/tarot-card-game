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
  flipCard: (cardId: string, playerId?: string) => void;
  peekDestiny: () => void;
  forceDraw: () => void;
  initializeMatch: (matchData: Partial<MatchState>) => void;
  updateMatch: (updates: Partial<MatchState>) => void;
  useFateToFlip: (cardId: string, playerId?: string) => void;

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
        console.log('Playing card:', card.name, 'to slot:', targetSlot, 'for player:', playerId);
        const state = get();
        if (!state.currentMatch) {
          console.log('No current match!');
          return;
        }

        // For WebSocket-based games, send the play_card message to server
        if (state.isConnected) {
          // Import and use WebSocket playCard if connected
          import('../websocket/GameWebSocket').then(({ gameWebSocket }) => {
            gameWebSocket.playCard(card.id, targetSlot);
          });
          return;
        }

        // Fallback for local games (demo mode)
        const player = state.currentMatch.players[playerId];
        if (!player) {
          console.log('Player not found:', playerId);
          return;
        }

        console.log('Current board:', player.board);
        console.log('Current hand:', player.hand.map(c => c.name));

        // Check if player has enough fate
        if (card.cost > player.fate) {
          console.log('Not enough fate! Cost:', card.cost, 'Fate:', player.fate);
          return;
        }

        // Remove card from hand
        const updatedHand = player.hand.filter(c => c.id !== card.id);

        // Add card to board if slot provided
        const updatedBoard = [...player.board];
        if (targetSlot !== undefined && targetSlot < updatedBoard.length) {
          if (updatedBoard[targetSlot].card) {
            console.log('Slot already occupied!');
            return;
          }
          updatedBoard[targetSlot] = { ...updatedBoard[targetSlot], card };
          console.log('Card placed in slot', targetSlot);
        } else {
          console.log('Invalid slot:', targetSlot);
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

        // For WebSocket-based games, send the end_turn message to server
        // The server will handle fate increment and send back updated state
        if (state.isConnected) {
          // Import and use WebSocket endTurn if connected
          import('../websocket/GameWebSocket').then(({ gameWebSocket }) => {
            gameWebSocket.endTurn();
          });
          return;
        }

        // Fallback for local games (demo mode)
        const playerIds = Object.keys(state.currentMatch.players);
        const currentIndex = playerIds.indexOf(state.currentMatch.activePlayer);
        const nextIndex = (currentIndex + 1) % playerIds.length;
        const nextPlayer = playerIds[nextIndex];

        // Draw a card for the next player if they have cards in deck
        const nextPlayerData = state.currentMatch.players[nextPlayer];
        // Legends of Runeterra-style mana: at the start of a player's turn,
        // increase their max mana by 1 (up to 10) and refill to full.
        const newMaxFate = Math.min(10, (nextPlayerData.maxFate ?? 0) + 1);
        const refilledFate = newMaxFate;
        let updatedHand = [...nextPlayerData.hand];
        let updatedDeck = [...nextPlayerData.deck];
        if (updatedDeck.length > 0) {
          const drawnCard = updatedDeck.shift();
          if (drawnCard) {
            updatedHand.push(drawnCard);
          }
        }

        set({
          currentMatch: {
            ...state.currentMatch,
            activePlayer: nextPlayer,
            turn: state.currentMatch.turn + 1,
            phase: 'main', // Start in main phase so cards can be played
            players: {
              ...state.currentMatch.players,
              [nextPlayer]: {
                ...nextPlayerData,
                maxFate: newMaxFate,
                fate: refilledFate,
                hand: updatedHand,
                deck: updatedDeck
                // Note: fate increment will be handled by server state updates
              }
            }
          }
        });
      },

      flipCard: (cardId, playerId = 'player1') => {
        console.log('Flipping card:', cardId);
        const state = get();
        if (!state.currentMatch) return;

        const player = state.currentMatch.players[playerId];
        if (!player) return;

        // Find card in hand or board and flip orientation
        const updatedHand = player.hand.map(card => {
          if (card.id === cardId) {
            return {
              ...card,
              orientation: card.orientation === 'upright' ? 'reversed' : 'upright'
            };
          }
          return card;
        });

        const updatedBoard = player.board.map(slot => {
          if (slot.card?.id === cardId) {
            return {
              ...slot,
              card: {
                ...slot.card,
                orientation: slot.card.orientation === 'upright' ? 'reversed' : 'upright'
              }
            };
          }
          return slot;
        });

        set({
          currentMatch: {
            ...state.currentMatch,
            players: {
              ...state.currentMatch.players,
              [playerId]: {
                ...player,
                hand: updatedHand,
                board: updatedBoard
              }
            }
          }
        });
      },

      useFateToFlip: (cardId, playerId = 'player1') => {
        const state = get();
        if (!state.currentMatch) return;

        const player = state.currentMatch.players[playerId];
        if (!player || player.fate < 1) {
          console.log('Not enough fate to flip card');
          return;
        }

        // Deduct fate and flip card
        set({
          currentMatch: {
            ...state.currentMatch,
            players: {
              ...state.currentMatch.players,
              [playerId]: {
                ...player,
                fate: player.fate - 1
              }
            }
          }
        });

        // Now flip the card
        get().flipCard(cardId, playerId);
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
            phase: 'main', // Start in main phase for first turn
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