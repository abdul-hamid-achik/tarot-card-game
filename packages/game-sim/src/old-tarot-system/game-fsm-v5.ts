/**
 * Finite State Machine for Tarot Card Game Flow
 * Updated for XState v5 API
 */

import { setup, assign } from 'xstate';

export interface GameContext {
  matchId: string;
  players: string[];
  currentPlayer: string;
  attackTokenOwner: string;
  turn: number;
  passedPlayers: Set<string>;
  priorityPlayer: string;
  lastAction: string | null;
  board: Record<string, any>;
  hands: Record<string, any[]>;
  fate: Record<string, number>;
  spellMana: Record<string, number>;
  maxFate: Record<string, number>;
  unitHasActed: Set<string>;
  burstSpellActive: boolean;
}

export type GameEvent =
  | { type: 'START_GAME' }
  | { type: 'DRAW_CARDS' }
  | { type: 'PLAY_UNIT'; playerId: string; cardId: string; slot: number; cost?: number }
  | { type: 'PLAY_SPELL'; playerId: string; cardId: string; spellSpeed: 'burst' | 'fast' | 'slow' }
  | { type: 'PASS'; playerId: string }
  | { type: 'INITIATE_COMBAT' }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'END_TURN' }
  | { type: 'UNIT_ACTION'; playerId: string; unitId: string }
  | { type: 'FATE_ACTION'; playerId: string; action: string };

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  guards: {
    canPlayUnit: ({ context, event }) => {
      if (event.type !== 'PLAY_UNIT') return false;
      const player = event.playerId;
      return (
        context.priorityPlayer === player &&
        context.fate[player] >= (event.cost || 0) &&
        !context.board[`${player}-${event.slot}`]
      );
    },

    isBurstSpell: ({ event }) => {
      if (event.type !== 'PLAY_SPELL') return false;
      return event.spellSpeed === 'burst';
    },

    canUnitAct: ({ context, event }) => {
      if (event.type !== 'UNIT_ACTION') return false;
      return (
        context.priorityPlayer === event.playerId &&
        !context.unitHasActed.has(event.unitId)
      );
    },

    bothPlayersPassed: ({ context }) => {
      return context.passedPlayers.size === context.players.length;
    },

    hasAttackersAndBlockers: ({ context }) => {
      const attackerBoard = Object.keys(context.board).filter(key => 
        key.startsWith(context.attackTokenOwner)
      );
      const defenderBoard = Object.keys(context.board).filter(key => 
        !key.startsWith(context.attackTokenOwner)
      );
      
      return attackerBoard.some(key => context.board[key]) && 
             defenderBoard.some(key => context.board[key]);
    },
  },
  actions: {
    incrementTurn: assign({
      turn: ({ context }) => context.turn + 1,
    }),
    
    resetPasses: assign({
      passedPlayers: () => new Set(),
    }),
    
    resetUnitsActed: assign({
      unitHasActed: () => new Set(),
    }),

    refillFate: assign({
      fate: ({ context }) => {
        const updated = { ...context.fate };
        context.players.forEach(p => {
          updated[p] = context.maxFate[p] || 1;
        });
        return updated;
      },
      spellMana: ({ context }) => {
        const updated = { ...context.spellMana };
        context.players.forEach(p => {
          const carryover = Math.max(0, context.fate[p] || 0);
          updated[p] = Math.min(3, (context.spellMana[p] || 0) + carryover);
        });
        return updated;
      },
    }),

    drawCardsForPlayers: ({ context }) => {
      // Implementation for drawing cards
      console.log('Drawing cards for all players');
    },

    placeUnit: assign({
      board: ({ context, event }) => {
        if (event.type !== 'PLAY_UNIT') return context.board;
        const key = `${event.playerId}-${event.slot}`;
        return { ...context.board, [key]: event.cardId };
      },
    }),

    spendFate: assign({
      fate: ({ context, event }) => {
        if (event.type !== 'PLAY_UNIT' && event.type !== 'PLAY_SPELL') return context.fate;
        const playerId = event.playerId;
        const cost = event.type === 'PLAY_UNIT' ? (event.cost || 0) : 0;
        return {
          ...context.fate,
          [playerId]: context.fate[playerId] - cost,
        };
      },
    }),

    castSpell: ({ event }) => {
      if (event.type === 'PLAY_SPELL') {
        console.log(`${event.playerId} casts ${event.cardId}`);
      }
    },

    passPriority: assign({
      priorityPlayer: ({ context }) => {
        const currentIndex = context.players.indexOf(context.priorityPlayer);
        const nextIndex = (currentIndex + 1) % context.players.length;
        return context.players[nextIndex];
      },
    }),

    recordPass: assign({
      passedPlayers: ({ context, event }) => {
        if (event.type !== 'PASS') return context.passedPlayers;
        const passed = new Set(context.passedPlayers);
        passed.add(event.playerId);
        return passed;
      },
    }),

    executeUnitAction: ({ event }) => {
      if (event.type === 'UNIT_ACTION') {
        console.log(`Unit ${event.unitId} takes action`);
      }
    },

    markUnitActed: assign({
      unitHasActed: ({ context, event }) => {
        if (event.type !== 'UNIT_ACTION') return context.unitHasActed;
        const acted = new Set(context.unitHasActed);
        acted.add(event.unitId);
        return acted;
      },
    }),

    setupCombat: ({ context }) => {
      console.log('Setting up combat phase');
    },

    executeCombat: ({ context }) => {
      console.log('Resolving combat');
      // Combat resolution logic here
    },

    cleanupPhase: ({ context }) => {
      console.log('Cleanup phase');
    },

    switchAttackToken: assign({
      attackTokenOwner: ({ context }) => {
        const currentIndex = context.players.indexOf(context.attackTokenOwner);
        const nextIndex = (currentIndex + 1) % context.players.length;
        return context.players[nextIndex];
      },
      maxFate: ({ context }) => {
        const updated = { ...context.maxFate };
        context.players.forEach(p => {
          updated[p] = Math.min(10, (updated[p] || 0) + 1);
        });
        return updated;
      },
    }),

    setInitialPriority: assign({
      priorityPlayer: ({ context }) => context.attackTokenOwner,
    }),
  },
}).createMachine({
  id: 'tarotGame',
  initial: 'roundBegin',
  context: {
    matchId: '',
    players: [],
    currentPlayer: '',
    attackTokenOwner: '',
    turn: 0,
    passedPlayers: new Set(),
    priorityPlayer: '',
    lastAction: null,
    board: {},
    hands: {},
    fate: {},
    spellMana: {},
    maxFate: {},
    unitHasActed: new Set(),
    burstSpellActive: false,
  },
  states: {
    roundBegin: {
      entry: [
        { type: 'incrementTurn' },
        { type: 'resetPasses' },
        { type: 'resetUnitsActed' },
      ],
      on: {
        DRAW_CARDS: {
          target: 'drawPhase',
          actions: [{ type: 'refillFate' }],
        },
      },
    },

    drawPhase: {
      entry: { type: 'drawCardsForPlayers' },
      on: {
        START_GAME: 'mainPhase.idle',
      },
      after: {
        1000: 'mainPhase.idle',
      },
    },

    mainPhase: {
      initial: 'idle',
      states: {
        idle: {
          entry: { type: 'setInitialPriority' },
          on: {
            PLAY_UNIT: {
              target: 'unitPlayed',
              guard: 'canPlayUnit',
              actions: [
                { type: 'placeUnit' },
                { type: 'spendFate' },
              ],
            },
            PLAY_SPELL: [
              {
                target: 'burstSpell',
                guard: 'isBurstSpell',
                actions: [
                  { type: 'castSpell' },
                  { type: 'spendFate' },
                ],
              },
              {
                target: 'spellCast',
                actions: [
                  { type: 'castSpell' },
                  { type: 'spendFate' },
                  { type: 'passPriority' },
                ],
              },
            ],
            UNIT_ACTION: {
              target: 'unitAction',
              guard: 'canUnitAct',
              actions: { type: 'executeUnitAction' },
            },
            PASS: {
              actions: [
                { type: 'recordPass' },
                { type: 'passPriority' },
              ],
              target: 'checkPhaseEnd',
            },
          },
        },

        unitPlayed: {
          entry: { type: 'passPriority' },
          always: 'idle',
        },

        spellCast: {
          on: {
            PASS: {
              actions: { type: 'recordPass' },
              target: 'checkPhaseEnd',
            },
            PLAY_SPELL: [
              {
                target: 'burstSpell',
                guard: 'isBurstSpell',
                actions: [
                  { type: 'castSpell' },
                  { type: 'spendFate' },
                ],
              },
              {
                target: 'spellCast',
                actions: [
                  { type: 'castSpell' },
                  { type: 'spendFate' },
                  { type: 'passPriority' },
                ],
              },
            ],
          },
        },

        burstSpell: {
          // Burst spells don't pass priority
          always: 'idle',
        },

        unitAction: {
          entry: { type: 'markUnitActed' },
          always: 'idle',
        },

        checkPhaseEnd: {
          always: [
            {
              target: '#tarotGame.combatPhase',
              guard: 'bothPlayersPassed',
            },
            {
              target: 'idle',
            },
          ],
        },
      },
    },

    combatPhase: {
      initial: 'checkCombat',
      states: {
        checkCombat: {
          always: [
            {
              target: 'initiateCombat',
              guard: 'hasAttackersAndBlockers',
            },
            {
              target: '#tarotGame.endPhase',
            },
          ],
        },

        initiateCombat: {
          entry: { type: 'setupCombat' },
          on: {
            RESOLVE_COMBAT: 'resolveCombat',
          },
          after: {
            500: 'resolveCombat',
          },
        },

        resolveCombat: {
          entry: { type: 'executeCombat' },
          always: '#tarotGame.endPhase',
        },
      },
    },

    endPhase: {
      entry: [
        { type: 'cleanupPhase' },
        { type: 'switchAttackToken' },
      ],
      on: {
        END_TURN: 'roundBegin',
      },
      after: {
        1000: 'roundBegin',
      },
    },

    gameOver: {
      type: 'final',
    },
  },
});

export default gameMachine;