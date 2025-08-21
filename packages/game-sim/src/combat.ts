import type { MatchState, Unit, CombatPair, Keyword, PlayerState } from './types.js';

export class CombatSystem {
  /**
   * Declare attackers for combat phase
   */
  static declareAttackers(state: MatchState, playerId: string, attackerIds: string[]): MatchState {
    const playerState = state.playerStates[playerId];
    if (!playerState.hasAttackToken) {
      throw new Error('Player does not have attack token');
    }

    // Validate all attackers
    const attackingUnits: Unit[] = [];
    for (const unitId of attackerIds) {
      const unit = playerState.board.find(u => u?.id === unitId);
      if (!unit) throw new Error(`Unit ${unitId} not found`);
      if (!unit.canAttack) throw new Error(`Unit ${unitId} cannot attack`);
      if (unit.hasAttacked) throw new Error(`Unit ${unitId} has already attacked`);
      
      attackingUnits.push(unit);
      unit.isAttacking = true;
    }

    // Create initial combat pairs (no blockers yet)
    const combatPairs: CombatPair[] = attackingUnits.map(unit => ({
      attackerId: unit.id,
      blockerId: undefined
    }));

    return {
      ...state,
      combatPairs,
      phase: 'combat',
      priority: this.getOpponentId(state, playerId)
    };
  }

  /**
   * Declare blockers for incoming attacks
   */
  static declareBlockers(state: MatchState, playerId: string, blockAssignments: Array<{ blockerId: string; attackerId: string }>): MatchState {
    if (!state.combatPairs) {
      throw new Error('No combat to block');
    }

    const playerState = state.playerStates[playerId];
    const updatedPairs = [...state.combatPairs];

    for (const assignment of blockAssignments) {
      const blocker = playerState.board.find(u => u?.id === assignment.blockerId);
      if (!blocker) throw new Error(`Blocker ${assignment.blockerId} not found`);
      
      const pairIndex = updatedPairs.findIndex(p => p.attackerId === assignment.attackerId);
      if (pairIndex === -1) throw new Error(`Attacker ${assignment.attackerId} not found in combat`);
      
      // Handle Elusive keyword
      const attacker = this.findUnitById(state, assignment.attackerId);
      if (attacker?.keywords.includes('elusive') && !blocker.keywords.includes('elusive')) {
        throw new Error('Can only block Elusive units with Elusive units');
      }

      updatedPairs[pairIndex].blockerId = assignment.blockerId;
      blocker.isBlocking = true;
      blocker.blockedUnitId = assignment.attackerId;
    }

    return {
      ...state,
      combatPairs: updatedPairs
    };
  }

  /**
   * Resolve combat damage
   */
  static resolveCombat(state: MatchState): MatchState {
    if (!state.combatPairs) return state;

    let newState = { ...state };
    const deadUnits: string[] = [];

    for (const pair of state.combatPairs) {
      const attacker = this.findUnitById(newState, pair.attackerId);
      if (!attacker) continue;

      if (pair.blockerId) {
        // Unit vs Unit combat
        const blocker = this.findUnitById(newState, pair.blockerId);
        if (!blocker) continue;

        // Check for Quick Attack
        if (attacker.keywords.includes('quick-attack') && !blocker.keywords.includes('quick-attack')) {
          // Attacker strikes first
          newState = this.applyDamage(newState, blocker, attacker.currentAttack);
          if (blocker.currentHealth <= 0) {
            deadUnits.push(blocker.id);
          } else {
            // Blocker strikes back if alive
            newState = this.applyDamage(newState, attacker, blocker.currentAttack);
            if (attacker.currentHealth <= 0) deadUnits.push(attacker.id);
          }
        } else {
          // Simultaneous strikes
          newState = this.applyDamage(newState, blocker, attacker.currentAttack);
          newState = this.applyDamage(newState, attacker, blocker.currentAttack);
          
          if (attacker.currentHealth <= 0) deadUnits.push(attacker.id);
          if (blocker.currentHealth <= 0) deadUnits.push(blocker.id);
        }

        // Handle Overwhelm
        if (attacker.keywords.includes('overwhelm')) {
          const excessDamage = attacker.currentAttack - blocker.currentHealth;
          if (excessDamage > 0) {
            const opponentId = this.getOpponentId(newState, attacker.owner);
            newState = this.damageNexus(newState, opponentId, excessDamage);
          }
        }
      } else {
        // Direct nexus attack
        const opponentId = this.getOpponentId(newState, attacker.owner);
        newState = this.damageNexus(newState, opponentId, attacker.currentAttack);
      }

      // Handle Lifesteal
      if (attacker.keywords.includes('lifesteal')) {
        newState = this.healNexus(newState, attacker.owner, attacker.currentAttack);
      }
    }

    // Remove dead units
    newState = this.removeDeadUnits(newState, deadUnits);

    // Clear combat state
    newState = this.clearCombatFlags(newState);
    newState.combatPairs = undefined;

    return newState;
  }

  /**
   * Apply damage to a unit
   */
  private static applyDamage(state: MatchState, unit: Unit, damage: number): MatchState {
    let finalDamage = damage;

    // Handle Barrier
    if (unit.keywords.includes('barrier')) {
      unit.keywords = unit.keywords.filter(k => k !== 'barrier');
      return state; // Damage negated
    }

    // Handle Tough
    if (unit.keywords.includes('tough')) {
      finalDamage = Math.max(0, finalDamage - 1);
    }

    unit.currentHealth -= finalDamage;
    unit.damage += finalDamage;

    return state;
  }

  /**
   * Damage a player's nexus
   */
  private static damageNexus(state: MatchState, playerId: string, damage: number): MatchState {
    const playerState = state.playerStates[playerId];
    playerState.nexusHealth = Math.max(0, playerState.nexusHealth - damage);
    return state;
  }

  /**
   * Heal a player's nexus
   */
  private static healNexus(state: MatchState, playerId: string, amount: number): MatchState {
    const playerState = state.playerStates[playerId];
    playerState.nexusHealth = Math.min(20, playerState.nexusHealth + amount);
    return state;
  }

  /**
   * Remove dead units from the board
   */
  private static removeDeadUnits(state: MatchState, deadUnitIds: string[]): MatchState {
    for (const playerId of state.players) {
      const playerState = state.playerStates[playerId];
      playerState.board = playerState.board.map(unit => {
        if (unit && deadUnitIds.includes(unit.id)) {
          // Move to discard
          playerState.discard.push(unit.cardId);
          return null;
        }
        return unit;
      });
    }
    return state;
  }

  /**
   * Clear combat flags from all units
   */
  private static clearCombatFlags(state: MatchState): MatchState {
    for (const playerId of state.players) {
      const playerState = state.playerStates[playerId];
      playerState.board.forEach(unit => {
        if (unit) {
          unit.isAttacking = false;
          unit.isBlocking = false;
          unit.blockedUnitId = undefined;
          if (unit.isAttacking) {
            unit.hasAttacked = true;
          }
        }
      });
    }
    return state;
  }

  /**
   * Find a unit by ID across all players
   */
  private static findUnitById(state: MatchState, unitId: string): Unit | undefined {
    for (const playerId of state.players) {
      const unit = state.playerStates[playerId].board.find(u => u?.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  }

  /**
   * Get opponent ID
   */
  private static getOpponentId(state: MatchState, playerId: string): string {
    return state.players.find(p => p !== playerId) || '';
  }

  /**
   * Check for lethal damage (game end condition)
   */
  static checkVictory(state: MatchState): string | null {
    for (const playerId of state.players) {
      if (state.playerStates[playerId].nexusHealth <= 0) {
        return this.getOpponentId(state, playerId); // Opponent wins
      }
    }
    return null;
  }
}