import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { gameLogger, withGameLogging } from '@tarot/game-logger';

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

// Unit on the battlefield (lane-based)
export interface Unit {
  id: string;
  cardId: string;
  card: Card;
  owner: string;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  lane: number; // 0, 1, or 2
  canAttack: boolean;
  hasAttacked: boolean;
  keywords: string[];
  buffs: Array<{ type: string; value: number; duration?: number }>;
  damage: number;
  isAttacking?: boolean;
  isBlocking?: boolean;
  blockedUnitId?: string;
}

export interface Player {
  id: string;
  name: string;
  nexusHealth?: number; // Arcanum health
  health?: number; // Legacy support
  maxHealth?: number; // Legacy support
  fate?: number; // Legacy mana name
  maxFate?: number; // Legacy max mana
  mana?: number; // Current mana
  maxMana?: number; // Max mana (cap 10)
  spellMana?: number; // Banked spell mana (cap 3)
  deck: Card[];
  hand: Card[];
  discard: Card[];
  bench?: Array<Unit | null>; // Back row - units placed but not in combat (6 slots)
  battlefield?: Array<Unit | null>; // Combat row - attacking/blocking units (6 slots)
  board?: Array<any>; // Legacy support - will be removed
  hasAttackToken?: boolean;
  passed?: boolean;
  avatar?: string;
  isAI?: boolean;
  trials?: Trial[]; // Legacy support
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

// Combat pairing for attack/block
export interface CombatPair {
  attackerId: string;
  blockerId?: string; // Optional, can attack nexus directly
}

export interface MatchState {
  matchId: string;
  type?: 'pvp' | 'pve' | 'tutorial';
  turn: number;
  phase: GamePhase;
  activePlayer?: string; // Legacy support
  currentPlayer?: string; // Active player
  attackTokenOwner?: string; // Legacy support
  attackToken?: string; // Who has attack token this round
  players: Record<string, Player>;
  combatPairs?: CombatPair[]; // Active combat pairings
  spellStack?: Array<{
    id: string;
    cardId: string;
    owner: string;
    targets?: string[];
  }>;
  priority?: string; // Who has priority to act
  reactionWindow?: {
    open: boolean;
    respondingPlayer: string;
    source: string; // What triggered the reaction window
  };
  turnTimer?: number;
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
  pendingAttackOrder?: string[]; // Legacy support
}

// Debug helpers for tracking board changes
function logUnitRemoval(playerId: string, lane: number, unit: Unit, reason: string): void {
  try {
    gameLogger.logAction('unit_removal', {
      playerId,
      lane,
      unitId: unit.id,
      cardId: unit.cardId,
      reason,
    }, true);
  } catch (_) {
    // no-op
  }
}

function logBoardDiff(prevBoard: Array<Unit | null>, nextBoard: Array<Unit | null>, playerId: string, context: string): void {
  for (let lane = 0; lane < 3; lane++) {
    const prevUnit = prevBoard[lane];
    const nextUnit = nextBoard[lane];
    if (prevUnit && !nextUnit) {
      logUnitRemoval(playerId, lane, prevUnit, `diff:${context}`);
    } else if (prevUnit && nextUnit && prevUnit.id !== nextUnit.id) {
      gameLogger.logAction('unit_replace', {
        playerId,
        lane,
        from: { id: prevUnit.id, cardId: prevUnit.cardId },
        to: { id: nextUnit.id, cardId: nextUnit.cardId },
        context,
      }, true);
    }
  }
}

interface GameStore {
  // Match State
  currentMatch: MatchState | null;

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
  playCard: (card: Card, lane?: number, playerId?: string) => void;
  declareAttackers: (attackerIds: string[], playerId?: string) => void;
  declareBlockers: (blockAssignments: Array<{ blockerId: string; attackerId: string }>, playerId?: string) => void;
  resolveCombat: () => void;
  pass: (playerId?: string) => void; // Pass priority
  endTurn: () => void;
  endMatch: (result: 'victory' | 'defeat' | 'abandon') => void;
  initializeMatch: (matchData: Partial<MatchState>) => void;
  updateMatch: (updates: Partial<MatchState>) => void;

  // Connection

  setSearchingMatch: (searching: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      currentMatch: null,

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
      playCard: (card, lane, playerId = 'player1') => {
        const state = get();
        if (!state.currentMatch) {
          gameLogger.logAction('play_card', { cardName: card.name, lane, playerId }, false, 'No current match');
          return;
        }

        gameLogger.setContext({
          matchId: state.currentMatch.matchId,
          playerId,
          turn: state.currentMatch.turn,
          phase: state.currentMatch.phase
        });

        // Local game logic
        const player = state.currentMatch.players[playerId];
        if (!player) {
          gameLogger.logAction('play_card', { cardName: card.name, playerId }, false, 'Player not found');
          return;
        }

        // Turn guard: only active player can initiate actions locally
        if (state.currentMatch.activePlayer !== playerId) {
          gameLogger.logAction('play_card_denied', {
            cardName: card.name,
            reason: 'not_your_turn',
            activePlayer: state.currentMatch.activePlayer
          }, false, 'Play card denied - not your turn');
          return;
        }

        // Only log board state on failed attempts or first few turns for debugging
        if (!state.currentMatch || state.currentMatch.turn <= 3) {
          gameLogger.logAction('debug_board_state', {
            benchCount: player.bench?.filter(u => u !== null).length || 0,
            boardCount: player.board?.filter(u => u !== null).length || 0,
            handCount: player.hand.length,
            handNames: player.hand.slice(0, 3).map(c => c.name), // Limit to first 3 cards
            playerId
          }, true);
        }

        // Resource check: pay from fate (mana), and for spells, from spellMana if needed
        const isSpell = card.type === 'spell';
        const availableMana = player.fate + (isSpell ? (player.spellMana || 0) : 0);
        if (card.cost > availableMana) {
          gameLogger.logAction('play_card_denied', {
            cardName: card.name,
            reason: 'insufficient_mana',
            cost: card.cost,
            availableMana
          }, false, 'Play card denied - insufficient mana');
          return;
        }

        // Remove card from hand
        const updatedHand = player.hand.filter(c => c.id !== card.id);

        // Units go to bench, spells resolve instantly
        const updatedBench = [...(player.bench || Array(6).fill(null))];
        const updatedDiscard = [...player.discard];

        if (card.type === 'unit') {
          // Find first empty slot on bench
          const emptySlot = lane !== undefined ? lane : updatedBench.findIndex(slot => !slot);
          if (emptySlot === -1 || emptySlot >= 6) {
            gameLogger.logAction('play_card_denied', {
              cardName: card.name,
              reason: 'bench_full'
            }, false, 'Play card denied - bench is full');
            return;
          }
          if (updatedBench[emptySlot]) {
            gameLogger.logAction('play_card_denied', {
              cardName: card.name,
              reason: 'slot_occupied',
              slot: emptySlot
            }, false, 'Play card denied - slot occupied');
            return;
          }

          // Create unit and place on bench
          const unit: Unit = {
            id: `unit_${Date.now()}_${card.id}`,
            cardId: card.id,
            card: card,
            owner: playerId,
            currentAttack: card.attack || 0,
            currentHealth: card.health || 1,
            maxHealth: card.health || 1,
            lane: emptySlot,
            canAttack: false, // Summoning sickness
            hasAttacked: false,
            keywords: [],
            buffs: [],
            damage: 0
          };

          updatedBench[emptySlot] = unit;
          gameLogger.logAction('place_unit', { cardName: card.name, slot: emptySlot }, true);
        } else {
          // Spell: resolve immediately (placeholder), then discard
          gameLogger.logAction('cast_spell', { cardName: card.name, type: card.type }, true);
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
        
        console.log('Playing card:', card.name, 'Cost:', card.cost, 'Fate before:', player.fate, 'Fate after:', updatedFate);

        // Log the card play with resource changes
        const targetSlot = lane !== undefined ? lane : -1; // -1 for spells or when no specific slot
        withGameLogging.cardPlay(gameLogger, card, playerId, targetSlot, player.fate || 0, updatedFate);

        // Log resource changes
        if (player.fate !== updatedFate) {
          gameLogger.logResourceChange({
            resource: 'fate',
            before: player.fate,
            after: updatedFate,
            change: updatedFate - player.fate,
            reason: `Played ${card.name}`
          });
        }

        if (isSpell && player.spellMana !== spellMana) {
          gameLogger.logResourceChange({
            resource: 'spellMana',
            before: player.spellMana || 0,
            after: spellMana,
            change: spellMana - (player.spellMana || 0),
            reason: `Played spell ${card.name}`
          });
        }

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
                bench: updatedBench,
                fate: updatedFate,
                spellMana,
                discard: updatedDiscard
              }
            }
          }
        });

        // Log diff for immediate local play (bench updates)
        try {
          gameLogger.logAction('bench_updated', {
            playerId,
            benchCount: updatedBench.filter(u => u !== null).length
          }, true);
        } catch (_) { }
      },

      startCombat: () => {
        const state = get();
        if (!state.currentMatch) return;

        const match = state.currentMatch;
        const attackerId = match.attackTokenOwner || match.activePlayer;
        const playerIds = Object.keys(match.players);
        const defenderId = playerIds.find(id => id !== attackerId) || attackerId;
        const attacker = match.players[attackerId];
        const defender = match.players[defenderId];
        if (!attacker || !defender) return;

        gameLogger.setContext({
          matchId: match.matchId,
          turn: match.turn,
          phase: match.phase
        });

        gameLogger.logCombatStart();

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

        // Log phase transition
        withGameLogging.phaseChange(gameLogger, match.phase, nextPhase, 'Combat initiated');

        // Enter combat phase for a brief moment to show UI lines
        set({
          currentMatch: {
            ...match,
            phase: nextPhase
          }
        });

        // Resolve after animation sequence completes (2.5s total to show health updates)
        setTimeout(() => {
          const latest = get().currentMatch;
          if (!latest) return;

          const atk = latest.players[attackerId];
          const def = latest.players[defenderId];
          if (!atk || !def) return;

          const atkBoard = Array.from({ length: 6 }, (_, i) => atk.battlefield?.[i] || atk.board?.[i] || { card: null, position: i });
          const defBoard = Array.from({ length: 6 }, (_, i) => def.battlefield?.[i] || def.board?.[i] || { card: null, position: i });

          const updatedAtkBoard = [...atkBoard];
          const updatedDefBoard = [...defBoard];
          let newAttackerHealth = atk.health;
          let newDefenderHealth = def.health;
          const attackerDiscard = [...(atk.discard || [])];
          const defenderDiscard = [...(def.discard || [])];

          let combatSummary = {
            playerDamage: 0,
            opponentDamage: 0,
            unitsDestroyed: 0
          };

          // Build ordered lists of units (ignore empty positions for pairing)
          const atkUnits = updatedAtkBoard
            .map((slot, i) => ({ i, card: slot.card }))
            .filter(x => !!x.card) as { i: number; card: Card }[];
          const defUnits = updatedDefBoard
            .map((slot, i) => ({ i, card: slot.card }))
            .filter(x => !!x.card) as { i: number; card: Card }[];

          const pairs = Math.min(atkUnits.length, defUnits.length);
          for (let p = 0; p < pairs; p++) {
            const { i: ai, card: atkCard } = atkUnits[p];
            const { i: di, card: defCard } = defUnits[p];

            const atkDmg = effectivePower(atkCard as any, defCard as any);
            const defDmg = effectivePower(defCard as any, atkCard as any);

            const defNewHealth = Math.max(0, (defCard.health || 0) - atkDmg);
            const atkNewHealth = Math.max(0, (atkCard.health || 0) - defDmg);

            gameLogger.logCombat({
              subType: 'UNIT_CLASH',
              attacker: { id: atkCard.id, name: atkCard.name, attack: atkDmg, health: atkCard.health || 0, position: ai },
              defender: { id: defCard.id, name: defCard.name, attack: defDmg, health: defCard.health || 0, position: di },
              damage: atkDmg
            });

            // Defender resolution
            const defSlot = updatedDefBoard[di];
            if (defNewHealth <= 0) {
              logBoardRemoval(defenderId, di, defCard as any, `destroyed by attacker dealing ${atkDmg} damage`);
              gameLogger.logUnitDeath(defCard as any, di, `Destroyed by ${atkCard.name} dealing ${atkDmg} damage`);
              withGameLogging.healthChange(gameLogger, 'unit', defCard.id, defCard.name, defCard.health || 0, 0, atkCard.name, 'Combat damage');
              defenderDiscard.push(defCard as any);
              updatedDefBoard[di] = { ...defSlot, card: null };
              combatSummary.unitsDestroyed++;
            } else {
              withGameLogging.healthChange(gameLogger, 'unit', defCard.id, defCard.name, defCard.health || 0, defNewHealth, atkCard.name, 'Combat damage');
              updatedDefBoard[di] = { ...defSlot, card: { ...(defSlot.card as any), health: defNewHealth } };
            }

            // Attacker resolution
            const atkSlot = updatedAtkBoard[ai];
            if (atkNewHealth <= 0) {
              logBoardRemoval(attackerId, ai, atkCard as any, `destroyed by blocker dealing ${defDmg} damage`);
              gameLogger.logUnitDeath(atkCard as any, ai, `Destroyed by ${defCard.name} dealing ${defDmg} damage`);
              withGameLogging.healthChange(gameLogger, 'unit', atkCard.id, atkCard.name, atkCard.health || 0, 0, defCard.name, 'Combat damage');
              attackerDiscard.push(atkCard as any);
              updatedAtkBoard[ai] = { ...atkSlot, card: null };
              combatSummary.unitsDestroyed++;
            } else {
              withGameLogging.healthChange(gameLogger, 'unit', atkCard.id, atkCard.name, atkCard.health || 0, atkNewHealth, defCard.name, 'Combat damage');
              updatedAtkBoard[ai] = { ...atkSlot, card: { ...(atkSlot.card as any), health: atkNewHealth } };
            }
          }

          // Remaining attackers deal direct damage
          if (atkUnits.length > defUnits.length) {
            for (let r = pairs; r < atkUnits.length; r++) {
              const { i: ai, card: atkCard } = atkUnits[r];
              const dmg = effectivePower(atkCard as any, null);
              const old = newDefenderHealth;
              newDefenderHealth = Math.max(0, newDefenderHealth - dmg);
              gameLogger.logCombat({ subType: 'DIRECT_DAMAGE', attacker: { id: atkCard.id, name: atkCard.name, attack: dmg, health: atkCard.health || 0, position: ai }, damage: dmg });
              withGameLogging.healthChange(gameLogger, 'player', defenderId, 'Player', old, newDefenderHealth, atkCard.name, 'Direct combat damage');
              combatSummary.opponentDamage += dmg;
            }
          }

          // Log combat end
          gameLogger.logCombatEnd(combatSummary);
          withGameLogging.phaseChange(gameLogger, 'combat', 'main', 'Combat resolved');

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
                  battlefield: updatedAtkBoard,
                  board: updatedAtkBoard,
                  discard: attackerDiscard,
                },
                [defenderId]: {
                  ...def,
                  health: newDefenderHealth,
                  battlefield: updatedDefBoard,
                  board: updatedDefBoard,
                  discard: defenderDiscard,
                },
              }
            }
          });
        }, 2500);
      },

      // Declare attackers. Sets combat phase and waits for blocks.
      declareAttackers: (attackerIds, playerId = 'player1') => {
        const state = get();
        if (!state.currentMatch) return;

        const match = state.currentMatch;
        const attackerId = match.attackTokenOwner || playerId;
        const playerIds = Object.keys(match.players);
        const defenderId = playerIds.find(id => id !== attackerId) || attackerId;

        // Enter combat phase and store attack order
        set({
          currentMatch: {
            ...match,
            phase: 'combat',
            activePlayer: defenderId, // Defender chooses blocks now
            pendingAttackOrder: attackerIds,
            pendingBlockOrder: [],
          }
        });

        gameLogger.logAction('declare_attackers', {
          playerId: attackerId,
          attackers: attackerIds
        }, true);

        // If defender is AI, auto-assign simple blocks and resolve after brief delay
        const defender = match.players[defenderId];
        if (defender?.isAI) {
          const defUnits = defender.board.map((s) => s.card).filter(Boolean) as Card[];
          const autoBlocks = defUnits.slice(0, attackerIds.length).map(c => c.id);
          set({
            currentMatch: {
              ...get().currentMatch!,
              pendingBlockOrder: autoBlocks,
            }
          });
          setTimeout(() => {
            get().resolveDeclaredCombat();
          }, 900);
        }
      },

      setBlockOrder: (blockerIds: string[]) => {
        const state = get();
        if (!state.currentMatch) return;
        set({
          currentMatch: {
            ...state.currentMatch,
            pendingBlockOrder: blockerIds,
          }
        });
      },

      resolveDeclaredCombat: () => {
        const state = get();
        if (!state.currentMatch) return;

        const match = state.currentMatch;
        const attackerId = match.attackTokenOwner || match.activePlayer;
        const playerIds = Object.keys(match.players);
        const defenderId = playerIds.find(id => id !== attackerId) || attackerId;
        const atk = match.players[attackerId];
        const def = match.players[defenderId];
        if (!atk || !def) return;

        const atkBoard = Array.from({ length: 6 }, (_, i) => atk.battlefield?.[i] || atk.board?.[i] || { card: null, position: i });
        const defBoard = Array.from({ length: 6 }, (_, i) => def.battlefield?.[i] || def.board?.[i] || { card: null, position: i });

        const updatedAtkBoard = [...atkBoard];
        const updatedDefBoard = [...defBoard];
        let newAttackerHealth = atk.health;
        let newDefenderHealth = def.health;
        const attackerDiscard = [...(atk.discard || [])];
        const defenderDiscard = [...(def.discard || [])];

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

        const attackIds = match.pendingAttackOrder || [];
        const blockIds = match.pendingBlockOrder || [];
        const pairs = Math.min(attackIds.length, blockIds.length);

        // Utility to find board index by card ID
        const findIndexById = (board: typeof atkBoard, id: string) => board.findIndex(s => s.card?.id === id);

        for (let p = 0; p < pairs; p++) {
          const atkId = attackIds[p];
          const blkId = blockIds[p];
          const ai = findIndexById(updatedAtkBoard, atkId);
          const di = findIndexById(updatedDefBoard, blkId);
          if (ai < 0 || di < 0) continue;
          const atkCard = updatedAtkBoard[ai].card as Card;
          const defCard = updatedDefBoard[di].card as Card;

          const atkDmg = effectivePower(atkCard, defCard);
          const defDmg = effectivePower(defCard, atkCard);

          const defNewHealth = Math.max(0, (defCard.health || 0) - atkDmg);
          const atkNewHealth = Math.max(0, (atkCard.health || 0) - defDmg);

          gameLogger.logCombat({
            subType: 'UNIT_CLASH',
            attacker: { id: atkCard.id, name: atkCard.name, attack: atkDmg, health: atkCard.health || 0, position: ai },
            defender: { id: defCard.id, name: defCard.name, attack: defDmg, health: defCard.health || 0, position: di },
            damage: atkDmg
          });

          // Update defender
          if (defNewHealth <= 0) {
            logBoardRemoval(defenderId, di, defCard, `destroyed by attacker dealing ${atkDmg} damage`);
            gameLogger.logUnitDeath(defCard, di, `Destroyed by ${atkCard.name} dealing ${atkDmg} damage`);
            withGameLogging.healthChange(gameLogger, 'unit', defCard.id, defCard.name, defCard.health || 0, 0, atkCard.name, 'Combat damage');
            defenderDiscard.push(defCard);
            updatedDefBoard[di] = { ...updatedDefBoard[di], card: null };
          } else {
            withGameLogging.healthChange(gameLogger, 'unit', defCard.id, defCard.name, defCard.health || 0, defNewHealth, atkCard.name, 'Combat damage');
            updatedDefBoard[di] = { ...updatedDefBoard[di], card: { ...(updatedDefBoard[di].card as Card), health: defNewHealth } };
          }

          // Update attacker
          if (atkNewHealth <= 0) {
            logBoardRemoval(attackerId, ai, atkCard, `destroyed by blocker dealing ${defDmg} damage`);
            gameLogger.logUnitDeath(atkCard, ai, `Destroyed by ${defCard.name} dealing ${defDmg} damage`);
            withGameLogging.healthChange(gameLogger, 'unit', atkCard.id, atkCard.name, atkCard.health || 0, 0, defCard.name, 'Combat damage');
            attackerDiscard.push(atkCard);
            updatedAtkBoard[ai] = { ...updatedAtkBoard[ai], card: null };
          } else {
            withGameLogging.healthChange(gameLogger, 'unit', atkCard.id, atkCard.name, atkCard.health || 0, atkNewHealth, defCard.name, 'Combat damage');
            updatedAtkBoard[ai] = { ...updatedAtkBoard[ai], card: { ...(updatedAtkBoard[ai].card as Card), health: atkNewHealth } };
          }
        }

        // Remaining attackers (unblocked) deal direct damage
        for (let r = pairs; r < attackIds.length; r++) {
          const atkId = attackIds[r];
          const ai = updatedAtkBoard.findIndex(s => s.card?.id === atkId);
          if (ai < 0) continue;
          const atkCard = updatedAtkBoard[ai].card as Card;
          const dmg = effectivePower(atkCard, null);
          const old = newDefenderHealth;
          newDefenderHealth = Math.max(0, newDefenderHealth - dmg);
          gameLogger.logCombat({ subType: 'DIRECT_DAMAGE', attacker: { id: atkCard.id, name: atkCard.name, attack: dmg, health: atkCard.health || 0, position: ai }, damage: dmg });
          withGameLogging.healthChange(gameLogger, 'player', defenderId, 'Player', old, newDefenderHealth, atkCard.name, 'Direct combat damage');
        }

        // Write back state and exit combat phase
        set({
          currentMatch: {
            ...match,
            phase: 'main',
            pendingAttackOrder: [],
            pendingBlockOrder: [],
            players: {
              ...match.players,
              [attackerId]: {
                ...atk,
                health: newAttackerHealth,
                battlefield: updatedAtkBoard,
                board: updatedAtkBoard,
                discard: attackerDiscard,
              },
              [defenderId]: {
                ...def,
                health: newDefenderHealth,
                battlefield: updatedDefBoard,
                board: updatedDefBoard,
                discard: defenderDiscard,
              },
            }
          }
        });

        gameLogger.logCombatEnd({
          playerDamage: 0,
          opponentDamage: 0,
          unitsDestroyed: 0
        });
        withGameLogging.phaseChange(gameLogger, 'combat', 'main', 'Combat resolved');
      },

      endTurn: () => {
        // Acts as Pass Priority. If both players pass consecutively, end the round.
        const state = get();
        if (!state.currentMatch) return;

        gameLogger.setContext({
          matchId: state.currentMatch.matchId,
          turn: state.currentMatch.turn,
          phase: state.currentMatch.phase
        });

        const match = state.currentMatch;
        const playerIds = Object.keys(match.players);
        const current = match.activePlayer;
        const opponent = playerIds.find(id => id !== current) || current;

        // Handle phase transitions
        if (match.phase === 'draw') {
          // Move from draw phase to main phase
          gameLogger.logPhaseTransition(match.phase, 'main');
          withGameLogging.phaseChange(gameLogger, match.phase, 'main', 'Draw phase completed');
          set({
            currentMatch: {
              ...match,
              phase: 'main',
              lastPassBy: null,
              reactionWindow: { active: false },
            }
          });
          return;
        }

        if (match.phase === 'end') {
          // Move from end phase to new turn (draw phase)
          const newTokenOwner = match.attackTokenOwner && match.attackTokenOwner === current ? opponent : current;
          const updatedPlayers: Record<string, Player> = { ...match.players };

          // Update resources and draw cards for new turn
          for (const pid of playerIds) {
            const p = updatedPlayers[pid];
            const carry = Math.max(0, p.fate);
            const newSpell = Math.min(3, (p.spellMana || 0) + carry);
            const newMax = Math.min(10, (p.maxFate || 0) + 1);
            let newHand = [...p.hand];
            let newDeck = [...p.deck];

            // Draw card
            if (newDeck.length > 0) {
              const drawn = newDeck.shift();
              if (drawn) {
                newHand.push(drawn);
                gameLogger.logAction('draw_card', {
                  playerId: pid,
                  cardName: drawn.name,
                  handSize: newHand.length,
                  deckSize: newDeck.length
                }, true, 'Turn draw');
              }
            }

            updatedPlayers[pid] = {
              ...p,
              maxFate: newMax,
              fate: newMax,
              spellMana: newSpell,
              hand: newHand,
              deck: newDeck,
            };
          }

          gameLogger.logTurnStart(newTokenOwner || current, match.turn + 1, 'draw');
          withGameLogging.phaseChange(gameLogger, match.phase, 'draw', 'New turn started');

          set({
            currentMatch: {
              ...match,
              turn: match.turn + 1,
              phase: 'draw',
              activePlayer: newTokenOwner || current,
              attackTokenOwner: newTokenOwner || current,
              lastPassBy: null,
              reactionWindow: { active: false },
              players: updatedPlayers,
            }
          });
          return;
        }

        // If opponent passed last action too → end round
        const bothPassed = match.lastPassBy === opponent;

        gameLogger.logPlayerPass(current, bothPassed);

        if (bothPassed) {
          // Check if we should go to combat phase or end the round
          const attackTokenOwner = match.attackTokenOwner || current;
          const hasAttackers = Object.values(match.players[attackTokenOwner]?.board || {}).some((slot: any) => slot?.card);
          const hasBlockers = Object.values(match.players[opponent]?.board || {}).some((slot: any) => slot?.card);

          gameLogger.logAction('end_round_check', {
            attackTokenOwner,
            hasAttackers,
            hasBlockers,
            currentPlayer: current
          });

          // If attack token owner has units and opponent has units, go to combat phase
          if (hasAttackers && hasBlockers && attackTokenOwner === current && match.phase === 'main') {
            withGameLogging.phaseChange(gameLogger, match.phase, 'combat', 'Both players passed, units present');
            set({
              currentMatch: {
                ...match,
                phase: 'combat',
                activePlayer: attackTokenOwner,
                lastPassBy: null,
                reactionWindow: { active: false },
              }
            });
            return;
          }

          // Otherwise, end the round normally
          const newTokenOwner = match.attackTokenOwner && match.attackTokenOwner === current ? opponent : current;
          const updatedPlayers: Record<string, Player> = { ...match.players };

          gameLogger.logGameState('TURN_END', {
            oldTokenOwner: match.attackTokenOwner,
            newTokenOwner,
            turn: match.turn
          });
          for (const pid of playerIds) {
            const p = updatedPlayers[pid];
            const carry = Math.max(0, p.fate);
            const newSpell = Math.min(3, (p.spellMana || 0) + carry);
            const newMax = Math.min(10, (p.maxFate || 0) + 1);
            let newHand = [...p.hand];
            let newDeck = [...p.deck];

            // Log resource changes
            if (p.maxFate !== newMax) {
              gameLogger.logResourceChange({
                playerId: pid,
                resource: 'maxFate',
                before: p.maxFate,
                after: newMax,
                change: 1,
                reason: 'Turn progression'
              });
            }

            if (p.fate !== newMax) {
              gameLogger.logResourceChange({
                playerId: pid,
                resource: 'fate',
                before: p.fate,
                after: newMax,
                change: newMax - p.fate,
                reason: 'Turn refill'
              });
            }

            if ((p.spellMana || 0) !== newSpell) {
              gameLogger.logResourceChange({
                playerId: pid,
                resource: 'spellMana',
                before: p.spellMana || 0,
                after: newSpell,
                change: newSpell - (p.spellMana || 0),
                reason: 'Carryover mana'
              });
            }

            // Draw card
            if (newDeck.length > 0) {
              const drawn = newDeck.shift();
              if (drawn) {
                newHand.push(drawn);
                gameLogger.logAction('draw_card', {
                  playerId: pid,
                  cardName: drawn.name,
                  handSize: newHand.length,
                  deckSize: newDeck.length
                }, true, 'Turn draw');
              }
            } else {
              gameLogger.logAction('draw_card', { playerId: pid }, false, 'Empty deck');
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

          gameLogger.logTurnStart(newTokenOwner || current, match.turn + 1, 'main');
          withGameLogging.phaseChange(gameLogger, match.phase, 'main', 'New turn started');

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
        gameLogger.logAction('pass_priority', {
          from: current,
          to: opponent,
          phase: match.phase
        }, true);

        set({
          currentMatch: {
            ...match,
            activePlayer: opponent,
            lastPassBy: current,
            reactionWindow: match.reactionWindow?.active ? match.reactionWindow : { active: false },
          }
        });
      },

      endMatch: (result) => {
        const state = get();
        if (!state.currentMatch) return;

        gameLogger.logAction('match_end', {
          matchId: state.currentMatch.matchId,
          result,
          turn: state.currentMatch.turn,
          phase: state.currentMatch.phase
        }, true, `Match ended: ${result}`);

        // Clear match state
        set({ currentMatch: null });
      },

      flipCard: (cardId, playerId = 'player1') => {
        const state = get();
        if (!state.currentMatch) return;

        const player = state.currentMatch.players[playerId];
        if (!player) {
          gameLogger.logAction('flip_card', { cardId, playerId }, false, 'Player not found');
          return;
        }

        gameLogger.setContext({
          matchId: state.currentMatch.matchId,
          playerId,
          turn: state.currentMatch.turn,
          phase: state.currentMatch.phase
        });

        // Find card in hand or board and flip orientation
        let cardFound = false;
        let cardName = '';
        let oldOrientation = '';
        let newOrientation = '';

        const updatedHand = player.hand.map(card => {
          if (card.id === cardId) {
            cardFound = true;
            cardName = card.name;
            oldOrientation = card.orientation;
            newOrientation = card.orientation === 'upright' ? 'reversed' : 'upright';
            return {
              ...card,
              orientation: newOrientation as CardOrientation
            };
          }
          return card;
        });

        const updatedBoard = (player.board || player.battlefield || []).map(slot => {
          if (slot.card?.id === cardId) {
            if (!cardFound) {
              cardFound = true;
              cardName = slot.card.name;
              oldOrientation = slot.card.orientation;
              newOrientation = slot.card.orientation === 'upright' ? 'reversed' : 'upright';
            }
            return {
              ...slot,
              card: {
                ...slot.card,
                orientation: newOrientation as CardOrientation
              }
            };
          }
          return slot;
        });

        if (cardFound) {
          gameLogger.logAction('flip_card', {
            cardId,
            cardName,
            from: oldOrientation,
            to: newOrientation,
            location: updatedHand.some(c => c.id === cardId) ? 'hand' : 'board'
          }, true);
        } else {
          gameLogger.logAction('flip_card', { cardId }, false, 'Card not found');
        }

        set({
          currentMatch: {
            ...state.currentMatch,
            players: {
              ...state.currentMatch.players,
              [playerId]: {
                ...player,
                hand: updatedHand,
                battlefield: updatedBoard,
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
          gameLogger.logAction('flip_card_failed', {
            cardId,
            playerId,
            currentFate: player?.fate || 0,
            requiredFate: 1
          }, false, 'Not enough fate to flip card');
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
        gameLogger.logAction('peek_destiny', {}, true);
      },

      forceDraw: () => {
        gameLogger.logAction('force_draw', {}, true);
      },

      initializeMatch: (matchData) => {
        const matchId = matchData.matchId || `match-${Date.now()}`;
        const matchState = {
          matchId,
          type: matchData.type || 'pvp',
          turn: 1,
          phase: 'main', // Start in main phase for first turn
          activePlayer: 'player1',
          players: {},
          ...matchData
        } as MatchState;

        gameLogger.clearBuffer(); // Start fresh for new match
        gameLogger.logMatchStart(matchState);

        set({ currentMatch: matchState });
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


      setSearchingMatch: (searching) => set({ isSearchingMatch: searching }),
    }))
  )
);