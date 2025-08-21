/**
 * React hook for integrating XState game flow machine with the frontend
 */

import { useMachine } from '@xstate/react';
import { useEffect, useCallback } from 'react';
// Import the FSM - we'll need to export it properly from game-sim
// For now, using a local copy
import { lorGameMachine } from '@tarot/game-sim';
import { gameLogger } from '@tarot/game-logger';
import type { Card } from '../lib/types';

export function useGameStateMachine(matchId: string, players: string[], currentPlayerId: string) {
  const initialAttackOwner = players[Math.floor(Math.random() * players.length)] || players[0];
  const [state, send, service] = useMachine(lorGameMachine, {
    context: {
      matchId,
      players,
      round: 0,
      attackTokenOwner: initialAttackOwner,
      hasAttackToken: true,
      rallyTokens: 0,
      priorityPlayer: initialAttackOwner, // Attacker acts first per flowchart
      hasInitiative: false,
      consecutivePasses: 0,
      playersPassed: new Set(),
      spellStack: [],
      canRespondToStack: false,
      attackers: [],
      blockers: {},
      combatDeclared: false,
      mana: Object.fromEntries(players.map(p => [p, 0])),
      spellMana: Object.fromEntries(players.map(p => [p, 0])),
      maxMana: Object.fromEntries(players.map(p => [p, 0])),
      board: Object.fromEntries(players.map(p => [p, []])),
      hands: Object.fromEntries(players.map(p => [p, []])),
      decks: Object.fromEntries(players.map(p => [p, []])),
    },
  });

  // Log state transitions
  useEffect(() => {
    const subscription = service.subscribe((state) => {
      gameLogger.logGameState('FSM_STATE_CHANGE', {
        state: state.value,
        context: {
          round: state.context.round,
          priorityPlayer: state.context.priorityPlayer,
          attackTokenOwner: state.context.attackTokenOwner,
          hasAttackToken: state.context.hasAttackToken,
          spellStackSize: state.context.spellStack.length,
          combatDeclared: state.context.combatDeclared,
        },
      });
    });

    return subscription.unsubscribe;
  }, [service]);

  // Helper functions for game actions
  const playUnit = useCallback((card: Card) => {
    if (state.context.priorityPlayer !== currentPlayerId) {
      gameLogger.logAction('play_unit_denied', {
        reason: 'not_priority',
        currentPriority: state.context.priorityPlayer,
        attempted: currentPlayerId,
      }, false);
      return false;
    }

    send({
      type: 'PLAY_UNIT',
      playerId: currentPlayerId,
      card: {
        ...card,
        power: card.power || 0,
        health: card.health || 0,
        currentHealth: card.health || 0,
        keywords: [],
        canBlock: true,
        hasAttacked: false,
      },
    });

    gameLogger.logAction('play_unit', {
      playerId: currentPlayerId,
      card: card.name,
      cost: card.cost,
    });
    return true;
  }, [state.context.priorityPlayer, currentPlayerId, send]);

  const playSpell = useCallback((card: Card, targets?: string[]) => {
    if (state.context.priorityPlayer !== currentPlayerId) {
      // Check if we can respond to stack with fast/burst
      const canRespond = state.context.canRespondToStack &&
        (card.spellSpeed === 'fast' || card.spellSpeed === 'burst');

      if (!canRespond) {
        gameLogger.logAction('play_spell_denied', {
          reason: 'not_priority',
          spellSpeed: card.spellSpeed,
        }, false);
        return false;
      }
    }

    send({
      type: 'PLAY_SPELL',
      playerId: currentPlayerId,
      card,
      targets,
    });

    gameLogger.logAction('play_spell', {
      playerId: currentPlayerId,
      spell: card.name,
      speed: card.spellSpeed,
      targets,
    });
    return true;
  }, [state.context, currentPlayerId, send]);

  const declareAttack = useCallback((attackerIds: string[]) => {
    if (!state.context.hasAttackToken || state.context.attackTokenOwner !== currentPlayerId) {
      gameLogger.logAction('attack_denied', {
        reason: 'no_attack_token',
        tokenOwner: state.context.attackTokenOwner,
      }, false);
      return false;
    }

    send({
      type: 'DECLARE_ATTACK',
      playerId: currentPlayerId,
      attackers: attackerIds,
    });

    gameLogger.logCombatStart();
    gameLogger.logAction('declare_attack', {
      playerId: currentPlayerId,
      attackers: attackerIds,
    });
    return true;
  }, [state.context, currentPlayerId, send]);

  const declareBlockers = useCallback((blockers: Record<string, string>) => {
    if (state.context.attackTokenOwner === currentPlayerId) {
      gameLogger.logAction('block_denied', {
        reason: 'attacker_cannot_block',
      }, false);
      return false;
    }

    send({
      type: 'DECLARE_BLOCKERS',
      playerId: currentPlayerId,
      blockers,
    });

    gameLogger.logAction('declare_blockers', {
      playerId: currentPlayerId,
      blockers,
    });
    return true;
  }, [state.context.attackTokenOwner, currentPlayerId, send]);

  const pass = useCallback(() => {
    send({
      type: 'PASS',
      playerId: currentPlayerId,
    });

    const willEndRound = state.context.consecutivePasses >= 1;
    gameLogger.logPlayerPass(currentPlayerId, willEndRound);

    return true;
  }, [state.context.consecutivePasses, currentPlayerId, send]);

  const startRound = useCallback(() => {
    send({ type: 'ROUND_START' });
    gameLogger.logGameState('ROUND_START', {
      round: state.context.round + 1,
      attackToken: state.context.attackTokenOwner,
    });
  }, [state.context, send]);

  return {
    // State
    gameState: state.value,
    context: state.context,

    // Computed properties
    isMyPriority: state.context.priorityPlayer === currentPlayerId,
    canAttack: state.context.hasAttackToken && state.context.attackTokenOwner === currentPlayerId,
    canBlock: state.context.combatDeclared && state.context.attackTokenOwner !== currentPlayerId,
    isDefender: state.context.attackTokenOwner !== currentPlayerId,
    hasSpellsOnStack: state.context.spellStack.length > 0,

    // Actions
    playUnit,
    playSpell,
    declareAttack,
    declareBlockers,
    pass,
    startRound,

    // Debug
    _service: service,
  };
}