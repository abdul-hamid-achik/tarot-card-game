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
  fate: number; // Acts as Mana (LoR) for now
  maxFate: number; // Acts as Max Mana (cap 10)
  spellMana?: number; // Carryover mana usable for spells only (cap 3)
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
  attackTokenOwner?: string; // LoR-style attack token
  lastPassBy?: string | null; // Track consecutive passes
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

// Debug helpers for tracking board removals
function logBoardRemoval(playerId: string, slotIndex: number, card: Card, reason: string): void {
  try {
    console.log('[Board Removal]', {
      playerId,
      slotIndex,
      cardId: card.id,
      cardName: card.name,
      suit: card.suit,
      type: card.type,
      reason,
    });
  } catch (_) {
    // no-op
  }
}

function logBoardDiff(prevBoard: BoardSlot[], nextBoard: BoardSlot[], playerId: string, context: string): void {
  const len = Math.max(prevBoard.length, nextBoard.length, 6);
  for (let i = 0; i < len; i++) {
    const prevCard = prevBoard[i]?.card || null;
    const nextCard = nextBoard[i]?.card || null;
    if (prevCard && !nextCard) {
      logBoardRemoval(playerId, i, prevCard, `diff:${context}`);
    } else if (prevCard && nextCard && prevCard.id !== nextCard.id) {
      console.log('[Board Replace]', {
        playerId,
        slotIndex: i,
        from: { id: prevCard.id, name: prevCard.name },
        to: { id: nextCard.id, name: nextCard.name },
        context,
      });
    }
  }
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
  startCombat: () => void;
  endTurn: () => void; // Acts as Pass priority
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
        // Log board diffs when players/boards are being updated (helps catch unexpected removals)
        currentMatch: (() => {
          if (!state.currentMatch) return null;
          try {
            const prev = state.currentMatch;
            const next = { ...prev, ...update } as MatchState;
            if (update.players) {
              const prevIds = Object.keys(prev.players || {});
              for (const pid of prevIds) {
                const prevBoard = prev.players[pid]?.board || [];
                const nextBoard = (update.players as any)[pid]?.board || prev.players[pid]?.board || [];
                if (nextBoard && prevBoard) {
                  logBoardDiff(prevBoard, nextBoard, pid, 'updateMatchState');
                }
              }
            }
            return next;
          } catch (_) {
            return state.currentMatch ? { ...state.currentMatch, ...update } as MatchState : null;
          }
        })()
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

        // Turn guard: only active player can initiate actions locally
        if (state.currentMatch.activePlayer !== playerId) {
          console.log('Not your turn. Active player is', state.currentMatch.activePlayer);
          return;
        }

        console.log('Current board:', player.board);
        console.log('Current hand:', player.hand.map(c => c.name));

        // LoR-style resource check: pay from fate (mana), and for spells, from spellMana if needed
        const isSpell = card.type === 'spell';
        const availableMana = player.fate + (isSpell ? (player.spellMana || 0) : 0);
        if (card.cost > availableMana) {
          console.log('Not enough mana! Cost:', card.cost, 'Mana:', player.fate, 'SpellMana:', player.spellMana || 0);
          return;
        }

        // Remove card from hand
        const updatedHand = player.hand.filter(c => c.id !== card.id);

        // Board update path only for units; spells resolve instantly and go to discard
        const updatedBoard = [...player.board];
        const updatedDiscard = [...player.discard];
        if (card.type === 'unit' || card.type === 'major' || (card.type === 'spell' && card.suit === 'major')) {
          if (targetSlot === undefined || targetSlot >= updatedBoard.length) {
            console.log('Invalid slot for unit/major placement:', targetSlot);
            return;
          }
          if (updatedBoard[targetSlot].card) {
            console.log('Slot already occupied!');
            return;
          }
          updatedBoard[targetSlot] = { ...updatedBoard[targetSlot], card };
          console.log(card.type === 'major' ? 'Major Arcana placed in slot' : 'Unit placed in slot', targetSlot);
        } else {
          // Spell: resolve immediately (placeholder), then discard
          console.log('Casting spell:', card.name);
          updatedDiscard.push(card);
        }

        // Pay cost using mana then spell mana (spells only)
        let remainingCost = card.cost;
        let mana = player.fate;
        let spellMana = player.spellMana || 0;
        if (remainingCost > 0) {
          const spendFromMana = Math.min(remainingCost, mana);
          mana -= spendFromMana;
          remainingCost -= spendFromMana;
        }
        if (isSpell && remainingCost > 0) {
          const spendFromSpell = Math.min(remainingCost, spellMana);
          spellMana -= spendFromSpell;
          remainingCost -= spendFromSpell;
        }
        const updatedFate = mana;

        // Determine opponent to pass priority
        const playerIds = Object.keys(state.currentMatch.players);
        const opponentId = playerIds.find(id => id !== playerId) || playerId;

        // Update match state, open reaction window and pass priority to opponent
        set({
          currentMatch: {
            ...state.currentMatch,
            activePlayer: opponentId,
            lastPassBy: null,
            reactionWindow: { active: true, respondingPlayer: opponentId },
            players: {
              ...state.currentMatch.players,
              [playerId]: {
                ...player,
                hand: updatedHand,
                board: updatedBoard,
                fate: updatedFate,
                spellMana,
                discard: updatedDiscard
              }
            }
          }
        });

        // Log diff for immediate local play
        try {
          const prevBoard = player.board;
          logBoardDiff(prevBoard, updatedBoard, playerId, 'playCard');
        } catch (_) { }
      },

      startCombat: () => {
        const state = get();
        if (!state.currentMatch) return;

        const match = state.currentMatch;
        const attackerId = match.activePlayer;
        const playerIds = Object.keys(match.players);
        const defenderId = playerIds.find(id => id !== attackerId) || attackerId;
        const attacker = match.players[attackerId];
        const defender = match.players[defenderId];
        if (!attacker || !defender) return;

        // Helper functions
        const suitBonus = (atkSuit: CardSuit, defSuit: CardSuit): number => {
          if (atkSuit === 'major' || defSuit === 'major') return 0;
          if (atkSuit === defSuit) return -1;
          if (atkSuit === 'wands' && defSuit === 'cups') return 1;
          if (atkSuit === 'swords' && defSuit === 'pentacles') return 1;
          return 0;
        };

        const effectivePower = (card: Card | null | undefined, enemy: Card | null | undefined): number => {
          if (!card) return 0;
          const base = Math.max(0, card.attack || 0);
          const orientationBonus = card.orientation === 'upright' ? 1 : 0;
          const suitMod = enemy ? suitBonus(card.suit, enemy.suit) : 0;
          return Math.max(0, base + orientationBonus + suitMod);
        };

        const nextPhase: GamePhase = 'combat';
        // Enter combat phase for a brief moment to show UI lines
        set({
          currentMatch: {
            ...match,
            phase: nextPhase
          }
        });

        // Resolve after short delay so UI can reflect phase
        setTimeout(() => {
          const latest = get().currentMatch;
          if (!latest) return;

          const atk = latest.players[attackerId];
          const def = latest.players[defenderId];
          if (!atk || !def) return;

          const atkBoard = Array.from({ length: 6 }, (_, i) => atk.board[i] || { card: null, position: i });
          const defBoard = Array.from({ length: 6 }, (_, i) => def.board[i] || { card: null, position: i });

          const updatedAtkBoard = [...atkBoard];
          const updatedDefBoard = [...defBoard];
          let newAttackerHealth = atk.health;
          let newDefenderHealth = def.health;
          const attackerDiscard = [...(atk.discard || [])];
          const defenderDiscard = [...(def.discard || [])];

          for (let i = 0; i < 6; i++) {
            const atkSlot = updatedAtkBoard[i];
            const defSlot = updatedDefBoard[i];
            const atkCard = (atkSlot?.card?.type === 'unit' || atkSlot?.card?.type === 'major' || (atkSlot?.card?.type === 'spell' && atkSlot?.card?.suit === 'major')) ? atkSlot.card : null;
            const defCard = (defSlot?.card?.type === 'unit' || defSlot?.card?.type === 'major' || (defSlot?.card?.type === 'spell' && defSlot?.card?.suit === 'major')) ? defSlot.card : null;

            if (!atkCard && !defCard) continue;

            if (atkCard && defCard) {
              // Both units strike simultaneously (mutual damage like Legends of Runeterra)
              const atkDmg = effectivePower(atkCard, defCard);
              const defDmg = effectivePower(defCard, atkCard);

              // Calculate new health after damage (no orientation bonus for health)
              const defNewHealth = Math.max(0, (defCard.health || 0) - atkDmg);
              const atkNewHealth = Math.max(0, (atkCard.health || 0) - defDmg);

              // Handle defender card - destroy if health <= 0
              if (defSlot.card) {
                if (defNewHealth <= 0) {
                  logBoardRemoval(defenderId, i, defSlot.card, `destroyed by lane ${i} attacker dealing ${atkDmg} damage`);
                  defenderDiscard.push(defSlot.card);
                  updatedDefBoard[i] = { ...defSlot, card: null };
                } else {
                  updatedDefBoard[i] = { ...defSlot, card: { ...defSlot.card, health: defNewHealth } };
                }
              }

              // Handle attacker card - destroy if health <= 0
              if (atkSlot.card) {
                if (atkNewHealth <= 0) {
                  logBoardRemoval(attackerId, i, atkSlot.card, `destroyed by lane ${i} blocker dealing ${defDmg} damage`);
                  attackerDiscard.push(atkSlot.card);
                  updatedAtkBoard[i] = { ...atkSlot, card: null };
                } else {
                  updatedAtkBoard[i] = { ...atkSlot, card: { ...atkSlot.card, health: atkNewHealth } };
                }
              }
            } else if (atkCard && !defCard) {
              // Direct damage to defender nexus
              const dmg = effectivePower(atkCard, null);
              newDefenderHealth = Math.max(0, newDefenderHealth - dmg);
            }
          }

          // Write back state and exit combat phase
          set({
            currentMatch: {
              ...latest,
              phase: 'main',
              players: {
                ...latest.players,
                [attackerId]: {
                  ...atk,
                  health: newAttackerHealth,
                  board: updatedAtkBoard,
                  discard: attackerDiscard,
                },
                [defenderId]: {
                  ...def,
                  health: newDefenderHealth,
                  board: updatedDefBoard,
                  discard: defenderDiscard,
                },
              }
            }
          });
        }, 500);
      },

      endTurn: () => {
        // Acts as Pass Priority. If both players pass consecutively, end the round.
        const state = get();
        if (!state.currentMatch) return;

        // For WebSocket-based games
        if (state.isConnected) {
          import('../websocket/GameWebSocket').then(({ gameWebSocket }) => {
            gameWebSocket.endTurn();
          });
          return;
        }

        const match = state.currentMatch;
        const playerIds = Object.keys(match.players);
        const current = match.activePlayer;
        const opponent = playerIds.find(id => id !== current) || current;

        // If opponent passed last action too → end round
        const bothPassed = match.lastPassBy === opponent;

        if (bothPassed) {
          // End Round: Attack token passes, both draw 1, +1 max mana (max 10), refill, convert leftover to spell mana (cap 3)
          const newTokenOwner = match.attackTokenOwner && match.attackTokenOwner === current ? opponent : current;
          const updatedPlayers: Record<string, Player> = { ...match.players };
          for (const pid of playerIds) {
            const p = updatedPlayers[pid];
            const carry = Math.max(0, p.fate);
            const newSpell = Math.min(3, (p.spellMana || 0) + carry);
            const newMax = Math.min(10, (p.maxFate || 0) + 1);
            let newHand = [...p.hand];
            let newDeck = [...p.deck];
            if (newDeck.length > 0) {
              const drawn = newDeck.shift();
              if (drawn) newHand.push(drawn);
            }
            updatedPlayers[pid] = {
              ...p,
              maxFate: newMax,
              fate: newMax, // refill
              spellMana: newSpell,
              hand: newHand,
              deck: newDeck,
            };
          }

          set({
            currentMatch: {
              ...match,
              turn: match.turn + 1,
              phase: 'main',
              activePlayer: newTokenOwner || current,
              attackTokenOwner: newTokenOwner || current,
              lastPassBy: null,
              reactionWindow: { active: false },
              players: updatedPlayers,
            }
          });
          return;
        }

        // Otherwise, pass priority to opponent and mark last passer
        set({
          currentMatch: {
            ...match,
            activePlayer: opponent,
            lastPassBy: current,
            reactionWindow: match.reactionWindow?.active ? match.reactionWindow : { active: false },
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
              orientation: (card.orientation === 'upright' ? 'reversed' : 'upright') as CardOrientation
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
                orientation: (slot.card.orientation === 'upright' ? 'reversed' : 'upright') as CardOrientation
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