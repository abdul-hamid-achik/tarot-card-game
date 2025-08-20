/**
 * Legends of Runeterra Style Game Flow
 * Updated for XState v5 API
 */

import { setup, assign } from 'xstate';

export interface LoRGameContext {
  matchId: string;
  players: string[];
  round: number;
  
  // Attack token management
  attackTokenOwner: string;
  hasAttackToken: boolean;
  rallyTokens: number;
  
  // Priority system
  priorityPlayer: string;
  hasInitiative: boolean;
  
  // Pass tracking
  consecutivePasses: number;
  playersPassed: Set<string>;
  
  // Spell stack
  spellStack: SpellStackItem[];
  canRespondToStack: boolean;
  
  // Combat
  attackers: string[];
  blockers: Record<string, string>;
  combatDeclared: boolean;
  
  // Resources
  mana: Record<string, number>;
  spellMana: Record<string, number>;
  maxMana: Record<string, number>;
  
  // Board state
  board: Record<string, UnitCard[]>;
  hands: Record<string, Card[]>;
  decks: Record<string, Card[]>;
}

interface SpellStackItem {
  id: string;
  playerId: string;
  card: Card;
  targets?: string[];
  timestamp: number;
}

interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'unit' | 'spell' | 'landmark';
  spellSpeed?: 'burst' | 'focus' | 'fast' | 'slow';
  power?: number;
  health?: number;
}

interface UnitCard extends Card {
  power: number;
  health: number;
  currentHealth: number;
  keywords: string[];
  canBlock: boolean;
  hasAttacked: boolean;
}

export type LoRGameEvent =
  | { type: 'ROUND_START' }
  | { type: 'PLAY_UNIT'; playerId: string; card: UnitCard }
  | { type: 'PLAY_SPELL'; playerId: string; card: Card; targets?: string[] }
  | { type: 'DECLARE_ATTACK'; playerId: string; attackers: string[] }
  | { type: 'DECLARE_BLOCKERS'; playerId: string; blockers: Record<string, string> }
  | { type: 'PASS'; playerId: string }
  | { type: 'RESOLVE_STACK' }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'END_ROUND' }
  | { type: 'RALLY'; playerId: string };

export const lorGameMachine = setup({
  types: {
    context: {} as LoRGameContext,
    events: {} as LoRGameEvent,
  },
  guards: {
    canPlayUnit: ({ context, event }) => {
      if (event.type !== 'PLAY_UNIT') return false;
      const player = event.playerId;
      return (
        context.priorityPlayer === player &&
        context.mana[player] >= event.card.cost &&
        context.board[player].length < 6
      );
    },

    canPlaySpell: ({ context, event }) => {
      if (event.type !== 'PLAY_SPELL') return false;
      const player = event.playerId;
      const totalMana = context.mana[player] + context.spellMana[player];
      const card = event.card;
      
      if (totalMana < card.cost) return false;
      
      if (card.spellSpeed === 'slow' && (context.combatDeclared || context.spellStack.length > 0)) {
        return false;
      }
      
      if (card.spellSpeed === 'focus' && context.combatDeclared) {
        return false;
      }
      
      return context.priorityPlayer === player;
    },

    canAttack: ({ context, event }) => {
      if (event.type !== 'DECLARE_ATTACK') return false;
      return (
        context.priorityPlayer === event.playerId &&
        context.attackTokenOwner === event.playerId &&
        context.hasAttackToken &&
        !context.combatDeclared
      );
    },

    isBurstOrFocus: ({ event }) => {
      if (event.type !== 'PLAY_SPELL') return false;
      const speed = event.card.spellSpeed;
      return speed === 'burst' || speed === 'focus';
    },

    canRespondWithFastOrBurst: ({ event }) => {
      if (event.type !== 'PLAY_SPELL') return false;
      const speed = event.card.spellSpeed;
      return speed === 'fast' || speed === 'burst';
    },

    canPlayFastOrBurst: ({ event }) => {
      if (event.type !== 'PLAY_SPELL') return false;
      const speed = event.card.spellSpeed;
      return speed === 'fast' || speed === 'burst';
    },

    bothPlayersPassed: ({ context }) => {
      return context.consecutivePasses >= 2;
    },

    combatContinues: ({ context }) => {
      return context.attackers.length > 0;
    },
  },
  actions: {
    incrementRound: assign({
      round: ({ context }) => context.round + 1,
    }),

    resetPasses: assign({
      consecutivePasses: 0,
      playersPassed: () => new Set(),
    }),

    resetCombat: assign({
      hasAttackToken: true,
      combatDeclared: false,
      attackers: [],
      blockers: {},
    }),

    incrementMana: assign({
      maxMana: ({ context }) => {
        const updated = { ...context.maxMana };
        context.players.forEach(p => {
          updated[p] = Math.min(10, (updated[p] || 0) + 1);
        });
        return updated;
      },
    }),

    refillMana: assign({
      mana: ({ context }) => {
        const updated = { ...context.mana };
        context.players.forEach(p => {
          updated[p] = context.maxMana[p];
        });
        return updated;
      },
    }),

    drawCards: ({ context }) => {
      context.players.forEach(playerId => {
        if (context.decks[playerId] && context.decks[playerId].length > 0) {
          const card = context.decks[playerId].shift();
          if (card) {
            context.hands[playerId].push(card);
          }
        }
      });
    },

    switchAttackToken: assign({
      attackTokenOwner: ({ context }) => {
        const currentIndex = context.players.indexOf(context.attackTokenOwner);
        const nextIndex = (currentIndex + 1) % context.players.length;
        return context.players[nextIndex];
      },
    }),

    setDefenderPriority: assign({
      priorityPlayer: ({ context }) => {
        const defender = context.players.find(p => p !== context.attackTokenOwner) || context.players[0];
        return defender;
      },
      hasInitiative: ({ context }) => {
        const defender = context.players.find(p => p !== context.attackTokenOwner);
        return context.priorityPlayer === defender;
      },
    }),

    playUnit: ({ context, event }) => {
      if (event.type === 'PLAY_UNIT') {
        context.board[event.playerId].push(event.card);
      }
    },

    spendMana: assign({
      mana: ({ context, event }) => {
        if (event.type !== 'PLAY_UNIT' && event.type !== 'PLAY_SPELL') return context.mana;
        const cost = event.card.cost;
        let remainingCost = cost;
        const updated = { ...context.mana };
        
        if (updated[event.playerId] >= remainingCost) {
          updated[event.playerId] -= remainingCost;
          return updated;
        }
        
        remainingCost -= updated[event.playerId];
        updated[event.playerId] = 0;
        
        const spellManaUpdated = { ...context.spellMana };
        spellManaUpdated[event.playerId] -= remainingCost;
        
        return updated;
      },
    }),

    passPriority: assign({
      priorityPlayer: ({ context }) => {
        const currentIndex = context.players.indexOf(context.priorityPlayer);
        const nextIndex = (currentIndex + 1) % context.players.length;
        return context.players[nextIndex];
      },
      consecutivePasses: 0,
      playersPassed: () => new Set(),
    }),

    recordPass: assign({
      consecutivePasses: ({ context }) => context.consecutivePasses + 1,
      playersPassed: ({ context, event }) => {
        if (event.type !== 'PASS') return context.playersPassed;
        const passed = new Set(context.playersPassed);
        passed.add(event.playerId);
        return passed;
      },
    }),

    addToStack: assign({
      spellStack: ({ context, event }) => {
        if (event.type !== 'PLAY_SPELL') return context.spellStack;
        return [...context.spellStack, {
          id: `spell_${Date.now()}`,
          playerId: event.playerId,
          card: event.card,
          targets: event.targets,
          timestamp: Date.now(),
        }];
      },
    }),

    resolveBurstSpell: ({ event }) => {
      if (event.type === 'PLAY_SPELL') {
        console.log(`Resolving ${event.card.spellSpeed} spell: ${event.card.name}`);
      }
    },

    openSpellStack: assign({
      canRespondToStack: true,
      consecutivePasses: 0,
    }),

    recordStackPass: assign({
      consecutivePasses: ({ context }) => context.consecutivePasses + 1,
    }),

    resolveSpellStack: ({ context }) => {
      while (context.spellStack.length > 0) {
        const spell = context.spellStack.pop();
        if (spell) {
          console.log(`Resolving: ${spell.card.name}`);
        }
      }
    },

    consumeAttackToken: assign({
      hasAttackToken: false,
    }),

    setAttackers: assign({
      attackers: ({ event }) => {
        if (event.type !== 'DECLARE_ATTACK') return [];
        return event.attackers;
      },
      combatDeclared: true,
    }),

    createCombatStack: ({ context }) => {
      console.log('Combat declared with attackers:', context.attackers);
    },

    givePriorityToDefender: assign({
      priorityPlayer: ({ context }) => {
        return context.players.find(p => p !== context.attackTokenOwner) || context.players[0];
      },
    }),

    givePriorityToAttacker: assign({
      priorityPlayer: ({ context }) => context.attackTokenOwner,
    }),

    setBlockers: assign({
      blockers: ({ event }) => {
        if (event.type !== 'DECLARE_BLOCKERS') return {};
        return event.blockers;
      },
    }),

    executeCombat: ({ context }) => {
      console.log('Resolving combat:', context.attackers, 'vs', context.blockers);
    },

    cleanupRound: ({ context }) => {
      console.log('Round', context.round, 'ended');
    },

    saveUnusedManaAsSpellMana: assign({
      spellMana: ({ context }) => {
        const updated = { ...context.spellMana };
        context.players.forEach(p => {
          const unused = context.mana[p];
          updated[p] = Math.min(3, (updated[p] || 0) + unused);
        });
        return updated;
      },
    }),
  },
}).createMachine({
  id: 'lorGame',
  initial: 'roundStart',
  context: {
    matchId: '',
    players: [],
    round: 0,
    attackTokenOwner: '',
    hasAttackToken: true,
    rallyTokens: 0,
    priorityPlayer: '',
    hasInitiative: false,
    consecutivePasses: 0,
    playersPassed: new Set(),
    spellStack: [],
    canRespondToStack: false,
    attackers: [],
    blockers: {},
    combatDeclared: false,
    mana: {},
    spellMana: {},
    maxMana: {},
    board: {},
    hands: {},
    decks: {},
  },
  states: {
    roundStart: {
      entry: [
        { type: 'incrementRound' },
        { type: 'resetPasses' },
        { type: 'resetCombat' },
        { type: 'incrementMana' },
        { type: 'refillMana' },
        { type: 'drawCards' },
        { type: 'switchAttackToken' },
        { type: 'setDefenderPriority' },
      ],
      always: 'actionPhase',
    },

    actionPhase: {
      initial: 'waitingForAction',
      states: {
        waitingForAction: {
          on: {
            PLAY_UNIT: {
              target: 'unitPlayed',
              guard: 'canPlayUnit',
              actions: [
                { type: 'playUnit' },
                { type: 'spendMana' },
                { type: 'passPriority' },
              ],
            },
            PLAY_SPELL: [
              {
                target: 'spellPlayed',
                guard: 'canPlaySpell',
                actions: { type: 'addToStack' },
              },
            ],
            DECLARE_ATTACK: {
              target: '#lorGame.combatPhase',
              guard: 'canAttack',
              actions: [
                { type: 'consumeAttackToken' },
                { type: 'setAttackers' },
              ],
            },
            PASS: {
              actions: { type: 'recordPass' },
              target: 'checkRoundEnd',
            },
          },
        },

        unitPlayed: {
          entry: { type: 'passPriority' },
          always: 'waitingForAction',
        },

        spellPlayed: {
          always: [
            {
              target: 'waitingForAction',
              guard: 'isBurstOrFocus',
              actions: { type: 'resolveBurstSpell' },
            },
            {
              target: 'spellStack',
            },
          ],
        },

        spellStack: {
          entry: { type: 'openSpellStack' },
          on: {
            PLAY_SPELL: {
              guard: 'canRespondWithFastOrBurst',
              actions: { type: 'addToStack' },
            },
            PASS: {
              actions: { type: 'recordStackPass' },
              target: 'resolveStack',
            },
          },
        },

        resolveStack: {
          entry: { type: 'resolveSpellStack' },
          always: 'waitingForAction',
        },

        checkRoundEnd: {
          always: [
            {
              target: '#lorGame.roundEnd',
              guard: 'bothPlayersPassed',
            },
            {
              target: 'waitingForAction',
              actions: { type: 'passPriority' },
            },
          ],
        },
      },
    },

    combatPhase: {
      initial: 'attackDeclared',
      states: {
        attackDeclared: {
          entry: [
            { type: 'createCombatStack' },
            { type: 'givePriorityToDefender' },
          ],
          on: {
            DECLARE_BLOCKERS: {
              target: 'blocksDeclared',
              actions: { type: 'setBlockers' },
            },
            PLAY_SPELL: {
              guard: 'canPlayFastOrBurst',
              actions: { type: 'addToStack' },
              target: 'combatStack',
            },
            PASS: {
              target: 'blocksDeclared',
            },
          },
        },

        blocksDeclared: {
          entry: { type: 'givePriorityToAttacker' },
          on: {
            PLAY_SPELL: {
              guard: 'canPlayFastOrBurst',
              actions: { type: 'addToStack' },
              target: 'combatStack',
            },
            PASS: {
              target: 'resolveCombat',
            },
          },
        },

        combatStack: {
          on: {
            PLAY_SPELL: {
              guard: 'canPlayFastOrBurst',
              actions: { type: 'addToStack' },
            },
            PASS: {
              actions: { type: 'recordStackPass' },
              target: 'resolveCombatStack',
            },
          },
        },

        resolveCombatStack: {
          entry: { type: 'resolveSpellStack' },
          always: [
            {
              target: 'attackDeclared',
              guard: 'combatContinues',
            },
            {
              target: 'resolveCombat',
            },
          ],
        },

        resolveCombat: {
          entry: { type: 'executeCombat' },
          always: '#lorGame.actionPhase',
        },
      },
    },

    roundEnd: {
      entry: [
        { type: 'cleanupRound' },
        { type: 'saveUnusedManaAsSpellMana' },
      ],
      on: {
        ROUND_START: 'roundStart',
      },
    },
  },
});

export default lorGameMachine;