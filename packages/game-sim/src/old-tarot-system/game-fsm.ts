/**
 * Finite State Machine for Tarot Card Game Flow
 * Implements the complete game flow according to the round flowchart
 */

import { createMachine, assign, send } from 'xstate';

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
  | { type: 'PLAY_UNIT'; playerId: string; cardId: string; slot: number }
  | { type: 'PLAY_SPELL'; playerId: string; cardId: string; spellSpeed: 'burst' | 'fast' | 'slow' }
  | { type: 'PASS'; playerId: string }
  | { type: 'INITIATE_COMBAT' }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'END_TURN' }
  | { type: 'UNIT_ACTION'; playerId: string; unitId: string }
  | { type: 'FATE_ACTION'; playerId: string; action: string };

export const gameMachine = createMachine<GameContext, GameEvent>({
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
      entry: assign({
        turn: (ctx) => ctx.turn + 1,
        passedPlayers: () => new Set(),
        unitHasActed: () => new Set(),
      }),
      on: {
        DRAW_CARDS: {
          target: 'drawPhase',
          actions: assign({
            fate: (ctx) => {
              const updated = { ...ctx.fate };
              ctx.players.forEach(p => {
                updated[p] = ctx.maxFate[p] || 1;
              });
              return updated;
            },
            spellMana: (ctx) => {
              const updated = { ...ctx.spellMana };
              ctx.players.forEach(p => {
                const carryover = Math.max(0, ctx.fate[p] || 0);
                updated[p] = Math.min(3, (ctx.spellMana[p] || 0) + carryover);
              });
              return updated;
            },
          }),
        },
      },
    },

    drawPhase: {
      entry: 'drawCardsForPlayers',
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
          entry: assign({
            priorityPlayer: (ctx) => ctx.attackTokenOwner,
          }),
          on: {
            PLAY_UNIT: {
              target: 'unitPlayed',
              cond: 'canPlayUnit',
              actions: ['placeUnit', 'spendFate'],
            },
            PLAY_SPELL: [
              {
                target: 'burstSpell',
                cond: 'isBurstSpell',
                actions: ['castSpell', 'spendFate'],
              },
              {
                target: 'spellCast',
                actions: ['castSpell', 'spendFate', 'passPriority'],
              },
            ],
            UNIT_ACTION: {
              target: 'unitAction',
              cond: 'canUnitAct',
              actions: 'executeUnitAction',
            },
            PASS: {
              actions: ['recordPass', 'passPriority'],
              target: 'checkPhaseEnd',
            },
          },
        },

        unitPlayed: {
          entry: 'passPriority',
          on: {
            '': 'idle',
          },
        },

        spellCast: {
          on: {
            PASS: {
              actions: 'recordPass',
              target: 'checkPhaseEnd',
            },
            PLAY_SPELL: [
              {
                target: 'burstSpell',
                cond: 'isBurstSpell',
                actions: ['castSpell', 'spendFate'],
              },
              {
                target: 'spellCast',
                actions: ['castSpell', 'spendFate', 'passPriority'],
              },
            ],
          },
        },

        burstSpell: {
          // Burst spells don't pass priority
          on: {
            '': 'idle',
          },
        },

        unitAction: {
          entry: assign({
            unitHasActed: (ctx, event: any) => {
              const acted = new Set(ctx.unitHasActed);
              acted.add(event.unitId);
              return acted;
            },
          }),
          on: {
            '': 'idle',
          },
        },

        checkPhaseEnd: {
          always: [
            {
              target: '#tarotGame.combatPhase',
              cond: 'bothPlayersPassed',
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
              cond: 'hasAttackersAndBlockers',
            },
            {
              target: '#tarotGame.endPhase',
            },
          ],
        },

        initiateCombat: {
          entry: 'setupCombat',
          on: {
            RESOLVE_COMBAT: 'resolveCombat',
          },
          after: {
            500: 'resolveCombat',
          },
        },

        resolveCombat: {
          entry: 'executeCombat',
          on: {
            '': '#tarotGame.endPhase',
          },
          after: {
            1500: '#tarotGame.endPhase',
          },
        },
      },
    },

    endPhase: {
      entry: [
        'cleanupPhase',
        assign({
          attackTokenOwner: (ctx) => {
            const currentIndex = ctx.players.indexOf(ctx.attackTokenOwner);
            const nextIndex = (currentIndex + 1) % ctx.players.length;
            return ctx.players[nextIndex];
          },
          maxFate: (ctx) => {
            const updated = { ...ctx.maxFate };
            ctx.players.forEach(p => {
              updated[p] = Math.min(10, (updated[p] || 0) + 1);
            });
            return updated;
          },
        }),
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
},
{
  guards: {
    canPlayUnit: (ctx, event: any) => {
      const player = event.playerId;
      return (
        ctx.priorityPlayer === player &&
        ctx.fate[player] >= (event.cost || 0) &&
        !ctx.board[`${player}-${event.slot}`]
      );
    },

    isBurstSpell: (ctx, event: any) => {
      return event.spellSpeed === 'burst';
    },

    canUnitAct: (ctx, event: any) => {
      return (
        ctx.priorityPlayer === event.playerId &&
        !ctx.unitHasActed.has(event.unitId)
      );
    },

    bothPlayersPassed: (ctx) => {
      return ctx.passedPlayers.size === ctx.players.length;
    },

    hasAttackersAndBlockers: (ctx) => {
      const attackerBoard = Object.keys(ctx.board).filter(key => 
        key.startsWith(ctx.attackTokenOwner)
      );
      const defenderBoard = Object.keys(ctx.board).filter(key => 
        !key.startsWith(ctx.attackTokenOwner)
      );
      
      return attackerBoard.some(key => ctx.board[key]) && 
             defenderBoard.some(key => ctx.board[key]);
    },
  },

  actions: {
    drawCardsForPlayers: (ctx) => {
      // Implementation for drawing cards
      console.log('Drawing cards for all players');
    },

    placeUnit: (ctx, event: any) => {
      const key = `${event.playerId}-${event.slot}`;
      ctx.board[key] = event.cardId;
    },

    spendFate: assign({
      fate: (ctx, event: any) => ({
        ...ctx.fate,
        [event.playerId]: ctx.fate[event.playerId] - (event.cost || 0),
      }),
    }),

    castSpell: (ctx, event: any) => {
      console.log(`${event.playerId} casts ${event.cardId}`);
    },

    passPriority: assign({
      priorityPlayer: (ctx) => {
        const currentIndex = ctx.players.indexOf(ctx.priorityPlayer);
        const nextIndex = (currentIndex + 1) % ctx.players.length;
        return ctx.players[nextIndex];
      },
    }),

    recordPass: assign({
      passedPlayers: (ctx, event: any) => {
        const passed = new Set(ctx.passedPlayers);
        passed.add(event.playerId);
        return passed;
      },
    }),

    executeUnitAction: (ctx, event: any) => {
      console.log(`Unit ${event.unitId} takes action`);
    },

    setupCombat: (ctx) => {
      console.log('Setting up combat phase');
    },

    executeCombat: (ctx) => {
      console.log('Resolving combat');
      // Combat resolution logic here
    },

    cleanupPhase: (ctx) => {
      console.log('Cleanup phase');
    },
  },
});

export default gameMachine;