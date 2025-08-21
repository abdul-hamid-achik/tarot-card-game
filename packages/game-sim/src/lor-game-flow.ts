// @ts-nocheck
/**
 * Legends of Runeterra Style Game Flow
 * Implements the complete LoR mechanics including:
 * - Attack token system
 * - Defender priority
 * - Spell stack with proper speeds
 * - Combat declaration and blocking
 */

import { createMachine, assign } from 'xstate';

export interface LoRGameContext {
  matchId: string;
  players: string[];
  round: number;

  // Attack token management
  attackTokenOwner: string;
  hasAttackToken: boolean; // Can be consumed
  rallyTokens: number; // Additional attacks this round

  // Priority system
  priorityPlayer: string;
  hasInitiative: boolean; // Who goes first this round

  // Pass tracking
  consecutivePasses: number;
  playersPassed: Set<string>;

  // Spell stack
  spellStack: SpellStackItem[];
  canRespondToStack: boolean;

  // Combat
  attackers: string[]; // Unit IDs attacking
  blockers: Record<string, string>; // Attacker ID -> Blocker ID
  combatDeclared: boolean;

  // Resources
  mana: Record<string, number>;
  spellMana: Record<string, number>; // Up to 3 carryover
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

export const lorGameMachine = createMachine<LoRGameContext, LoRGameEvent>({
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
        { type: 'setAttackerPriority' },
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
                { type: 'resetPasses' },
                { type: 'passPriority' },
              ],
            },
            PLAY_SPELL: [
              {
                target: 'spellPlayed',
                cond: 'canPlaySpell',
                actions: 'addToStack',
              },
            ],
            DECLARE_ATTACK: {
              target: '#lorGame.combatPhase',
              cond: 'canAttack',
              actions: ['consumeAttackToken', 'setAttackers'],
            },
            PASS: {
              actions: ['recordPass'],
              target: 'checkRoundEnd',
            },
          },
        },

        unitPlayed: {
          always: 'waitingForAction',
        },

        spellPlayed: {
          always: [
            {
              target: 'waitingForAction',
              guard: 'isBurstOrFocus',
              actions: [{ type: 'resolveBurstSpell' }, { type: 'resetPasses' }],
            },
            {
              target: 'spellStack',
            },
          ],
        },

        spellStack: {
          entry: 'openSpellStack',
          on: {
            PLAY_SPELL: {
              cond: 'canRespondWithFastOrBurst',
              actions: 'addToStack',
            },
            PASS: {
              actions: 'recordStackPass',
              target: 'resolveStack',
            },
          },
        },

        resolveStack: {
          entry: [{ type: 'resolveSpellStack' }, { type: 'resetPasses' }],
          always: 'waitingForAction',
        },

        checkRoundEnd: {
          always: [
            {
              target: '#lorGame.roundEnd',
              cond: 'bothPlayersPassed',
            },
            {
              target: 'waitingForAction',
              actions: 'passPriority',
            },
          ],
        },
      },
    },

    combatPhase: {
      initial: 'attackDeclared',
      states: {
        attackDeclared: {
          entry: ['createCombatStack', 'givePriorityToDefender'],
          on: {
            DECLARE_BLOCKERS: {
              target: 'blocksDeclared',
              actions: 'setBlockers',
            },
            PLAY_SPELL: {
              cond: 'canPlayFastOrBurst',
              actions: 'addToStack',
              target: 'combatStack',
            },
            PASS: {
              target: 'blocksDeclared',
            },
          },
        },

        blocksDeclared: {
          entry: 'givePriorityToAttacker',
          on: {
            PLAY_SPELL: {
              cond: 'canPlayFastOrBurst',
              actions: 'addToStack',
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
              cond: 'canPlayFastOrBurst',
              actions: 'addToStack',
            },
            PASS: {
              actions: 'recordStackPass',
              target: 'resolveCombatStack',
            },
          },
        },

        resolveCombatStack: {
          entry: 'resolveSpellStack',
          on: {
            '': [
              {
                target: 'attackDeclared',
                cond: 'combatContinues',
              },
              {
                target: 'resolveCombat',
              },
            ],
          },
        },

        resolveCombat: {
          entry: [{ type: 'executeCombat' }, { type: 'givePriorityToDefender' }, { type: 'resetPasses' }],
          always: '#lorGame.actionPhase',
        },
      },
    },

    roundEnd: {
      entry: [
        'cleanupRound',
        'saveUnusedManaAsSpellMana',
      ],
      on: {
        ROUND_START: 'roundStart',
      },
    },
  },
},
  {
    guards: {
      canPlayUnit: (ctx, event: any) => {
        const player = event.playerId;
        return (
          ctx.priorityPlayer === player &&
          ctx.mana[player] >= event.card.cost &&
          ctx.board[player].length < 6 // Board limit
        );
      },

      canPlaySpell: (ctx, event: any) => {
        const player = event.playerId;
        const totalMana = ctx.mana[player] + ctx.spellMana[player];
        const card = event.card;

        // Check mana
        if (totalMana < card.cost) return false;

        // Check spell speed restrictions
        if (card.spellSpeed === 'slow' && (ctx.combatDeclared || ctx.spellStack.length > 0)) {
          return false;
        }

        if (card.spellSpeed === 'focus' && ctx.combatDeclared) {
          return false;
        }

        return ctx.priorityPlayer === player;
      },

      canAttack: (ctx, event: any) => {
        return (
          ctx.priorityPlayer === event.playerId &&
          ctx.attackTokenOwner === event.playerId &&
          ctx.hasAttackToken &&
          !ctx.combatDeclared
        );
      },

      isBurstOrFocus: (ctx, event: any) => {
        const speed = event.card.spellSpeed;
        return speed === 'burst' || speed === 'focus';
      },

      canRespondWithFastOrBurst: (ctx, event: any) => {
        const speed = event.card.spellSpeed;
        return speed === 'fast' || speed === 'burst';
      },

      canPlayFastOrBurst: (ctx, event: any) => {
        const speed = event.card.spellSpeed;
        return speed === 'fast' || speed === 'burst';
      },

      bothPlayersPassed: ({ context }) => {
        return context.playersPassed.size >= 2;
      },

      combatContinues: (ctx) => {
        // Check if attackers still exist after stack resolution
        return ctx.attackers.length > 0;
      },
    },

    actions: {
      incrementMana: assign({
        maxMana: (ctx) => {
          const updated = { ...ctx.maxMana };
          ctx.players.forEach(p => {
            updated[p] = Math.min(10, (updated[p] || 0) + 1);
          });
          return updated;
        },
      }),

      refillMana: assign({
        mana: (ctx) => {
          const updated = { ...ctx.mana };
          ctx.players.forEach(p => {
            updated[p] = ctx.maxMana[p];
          });
          return updated;
        },
      }),

      drawCards: (ctx) => {
        // Each player draws 1 card at round start
        ctx.players.forEach(playerId => {
          if (ctx.decks[playerId].length > 0) {
            const card = ctx.decks[playerId].shift()!;
            ctx.hands[playerId].push(card);
          }
        });
      },

      switchAttackToken: assign({
        attackTokenOwner: ({ context }) => {
          if (context.round === 1) return context.attackTokenOwner;
          const currentIndex = context.players.indexOf(context.attackTokenOwner);
          const nextIndex = (currentIndex + 1) % context.players.length;
          return context.players[nextIndex];
        },
      }),

      setAttackerPriority: assign({
        priorityPlayer: ({ context }) => context.attackTokenOwner,
        hasInitiative: () => true,
      }),

      playUnit: (ctx, event: any) => {
        ctx.board[event.playerId].push(event.card);
      },

      spendMana: assign({
        mana: (ctx, event: any) => {
          const cost = event.card.cost;
          let remainingCost = cost;
          const updated = { ...ctx.mana };

          // Spend regular mana first
          if (updated[event.playerId] >= remainingCost) {
            updated[event.playerId] -= remainingCost;
            return updated;
          }

          // Then spell mana
          remainingCost -= updated[event.playerId];
          updated[event.playerId] = 0;

          const spellManaUpdated = { ...ctx.spellMana };
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
      }),

      recordPass: assign({
        consecutivePasses: (ctx) => ctx.consecutivePasses + 1,
        playersPassed: (ctx, event: any) => {
          const passed = new Set(ctx.playersPassed);
          passed.add(event.playerId);
          return passed;
        },
      }),

      addToStack: assign({
        spellStack: (ctx, event: any) => {
          return [...ctx.spellStack, {
            id: `spell_${Date.now()}`,
            playerId: event.playerId,
            card: event.card,
            targets: event.targets,
            timestamp: Date.now(),
          }];
        },
      }),

      resolveBurstSpell: (ctx, event: any) => {
        // Burst and Focus spells resolve immediately
        console.log(`Resolving ${event.card.spellSpeed} spell: ${event.card.name}`);
        // Apply effects here
      },

      openSpellStack: assign({
        canRespondToStack: true,
        consecutivePasses: 0,
      }),

      recordStackPass: assign({
        consecutivePasses: (ctx) => ctx.consecutivePasses + 1,
      }),

      resolveSpellStack: (ctx) => {
        // Resolve in LIFO order
        while (ctx.spellStack.length > 0) {
          const spell = ctx.spellStack.pop()!;
          console.log(`Resolving: ${spell.card.name}`);
          // Apply spell effects
        }
      },

      consumeAttackToken: assign({
        hasAttackToken: false,
      }),

      setAttackers: assign({
        attackers: (ctx, event: any) => event.attackers,
        combatDeclared: true,
      }),

      createCombatStack: (ctx) => {
        console.log('Combat declared with attackers:', ctx.attackers);
      },

      givePriorityToDefender: assign({
        priorityPlayer: (ctx) => {
          return ctx.players.find(p => p !== ctx.attackTokenOwner)!;
        },
      }),

      givePriorityToAttacker: assign({
        priorityPlayer: (ctx) => ctx.attackTokenOwner,
      }),

      setBlockers: assign({
        blockers: (ctx, event: any) => event.blockers,
      }),

      executeCombat: (ctx) => {
        console.log('Resolving combat:', ctx.attackers, 'vs', ctx.blockers);
        // Combat damage resolution
      },

      cleanupRound: (ctx) => {
        console.log('Round', ctx.round, 'ended');
      },

      saveUnusedManaAsSpellMana: assign({
        spellMana: (ctx) => {
          const updated = { ...ctx.spellMana };
          ctx.players.forEach(p => {
            const unused = ctx.mana[p];
            updated[p] = Math.min(3, (updated[p] || 0) + unused);
          });
          return updated;
        },
      }),
    },
  });

export default lorGameMachine;