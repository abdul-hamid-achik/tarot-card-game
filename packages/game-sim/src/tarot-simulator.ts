import { createSeededRandom } from './rng.js';
import type { MatchState, PlayerState, Unit, CardDefinition, CombatPair } from './types.js';

/**
 * Tarot Game Simulator
 * Implements tactical card game mechanics with bench/battlefield zones
 */
export class TarotSimulator {
  /**
   * Create initial game state with bench/battlefield zones
   */
  static createInitialState(params: {
    matchId: string;
    seed: string;
    players: string[];
    cardLibrary: Record<string, CardDefinition>;
    decks: Record<string, string[]>;
  }): MatchState {
    const playerStates: Record<string, PlayerState> = {};
    
    for (const playerId of params.players) {
      playerStates[playerId] = {
        id: playerId,
        nexusHealth: 20, // The Arcanum
        mana: 0,
        maxMana: 0,
        spellMana: 0,
        hand: [],
        deck: [...params.decks[playerId]],
        discard: [],
        bench: Array(6).fill(null), // 6 slots on bench
        battlefield: Array(6).fill(null), // 6 slots on battlefield
        hasAttackToken: false,
        passed: false
      };
    }

    // First player gets attack token
    playerStates[params.players[0]].hasAttackToken = true;

    const state: MatchState = {
      matchId: params.matchId,
      seed: params.seed,
      players: params.players,
      turn: 0,
      currentPlayer: params.players[0],
      phase: 'draw',
      playerStates,
      attackToken: params.players[0],
      spellStack: [],
      cardLibrary: params.cardLibrary,
      actionHistory: []
    };

    // Draw starting hands (4 cards each)
    return this.drawStartingHands(state);
  }

  private static drawStartingHands(state: MatchState): MatchState {
    const rng = createSeededRandom(state.seed);
    let newState = { ...state };

    for (const playerId of state.players) {
      for (let i = 0; i < 4; i++) {
        newState = this.drawCard(newState, playerId, rng);
      }
    }

    return newState;
  }

  /**
   * Play a card to the bench (units) or resolve immediately (spells)
   */
  static playCard(state: MatchState, playerId: string, cardId: string): MatchState {
    const playerState = state.playerStates[playerId];
    const cardIndex = playerState.hand.indexOf(cardId);
    
    if (cardIndex === -1) {
      throw new Error('Card not in hand');
    }

    const cardDef = state.cardLibrary[cardId];
    if (!cardDef) {
      throw new Error('Card definition not found');
    }

    // Check mana cost
    const totalMana = playerState.mana + playerState.spellMana;
    if (cardDef.cost > totalMana) {
      throw new Error('Not enough mana');
    }

    let newState = { ...state };

    // Deduct mana
    let remainingCost = cardDef.cost;
    if (remainingCost <= playerState.mana) {
      playerState.mana -= remainingCost;
    } else {
      remainingCost -= playerState.mana;
      playerState.mana = 0;
      playerState.spellMana = Math.max(0, playerState.spellMana - remainingCost);
    }

    // Remove card from hand
    playerState.hand.splice(cardIndex, 1);

    // Handle based on card type
    switch (cardDef.type) {
      case 'unit':
        // Find first empty slot on bench
        const emptySlot = playerState.bench.findIndex(slot => slot === null);
        if (emptySlot === -1) {
          throw new Error('Bench is full (6 units max)');
        }
        
        // Create unit and place on bench
        const unit: Unit = {
          id: `unit_${state.turn}_${cardId}_${Date.now()}`,
          cardId: cardId,
          owner: playerId,
          currentAttack: cardDef.attack || 0,
          currentHealth: cardDef.health || 1,
          maxHealth: cardDef.health || 1,
          position: emptySlot,
          zone: 'bench',
          canAttack: false, // Summoning sickness
          hasAttacked: false,
          keywords: cardDef.keywords || [],
          buffs: [],
          damage: 0
        };
        
        playerState.bench[emptySlot] = unit;
        break;

      case 'spell':
      case 'fast':
      case 'slow':
        // Add to spell stack
        newState.spellStack.push({
          id: `spell_${state.turn}_${cardId}`,
          cardId: cardId,
          owner: playerId,
          targets: []
        });
        break;

      case 'burst':
        // Burst spells resolve immediately
        // TODO: Apply spell effects based on cardDef
        break;
    }

    this.recordAction(newState, playerId, `play_card:${cardId}`);
    return newState;
  }

  /**
   * Declare attackers - move units from bench to battlefield
   */
  static declareAttackers(state: MatchState, playerId: string, unitIds: string[]): MatchState {
    const playerState = state.playerStates[playerId];
    
    if (!playerState.hasAttackToken) {
      throw new Error('Player does not have attack token');
    }

    // Clear current battlefield
    playerState.battlefield = Array(6).fill(null);

    // Move selected units from bench to battlefield
    let battlefieldIndex = 0;
    for (const unitId of unitIds) {
      const benchIndex = playerState.bench.findIndex(u => u?.id === unitId);
      if (benchIndex === -1) {
        throw new Error(`Unit ${unitId} not found on bench`);
      }

      const unit = playerState.bench[benchIndex];
      if (!unit) continue;

      if (!unit.canAttack) {
        throw new Error(`Unit ${unitId} cannot attack (summoning sickness)`);
      }

      if (unit.hasAttacked) {
        throw new Error(`Unit ${unitId} has already attacked`);
      }

      // Move to battlefield
      playerState.bench[benchIndex] = null;
      unit.zone = 'battlefield';
      unit.position = battlefieldIndex;
      unit.isAttacking = true;
      playerState.battlefield[battlefieldIndex] = unit;
      battlefieldIndex++;
    }

    // Create combat pairs (initially no blockers)
    state.combatPairs = unitIds.map(id => ({ attackerId: id }));
    state.phase = 'combat';

    this.recordAction(state, playerId, `declare_attackers:${unitIds.join(',')}`);
    return state;
  }

  /**
   * Declare blockers - move defending units from bench to battlefield
   */
  static declareBlockers(state: MatchState, playerId: string, blockAssignments: Array<{attackerId: string, blockerId: string}>): MatchState {
    const playerState = state.playerStates[playerId];
    const opponentId = state.players.find(p => p !== playerId);
    
    if (!opponentId || playerState.hasAttackToken) {
      throw new Error('Cannot declare blockers while having attack token');
    }

    if (!state.combatPairs) {
      throw new Error('No combat to block');
    }

    // Clear defender's battlefield
    playerState.battlefield = Array(6).fill(null);

    // Process each block assignment
    let battlefieldIndex = 0;
    for (const assignment of blockAssignments) {
      // Find blocker on bench
      const benchIndex = playerState.bench.findIndex(u => u?.id === assignment.blockerId);
      if (benchIndex === -1) {
        throw new Error(`Blocker ${assignment.blockerId} not found on bench`);
      }

      const blocker = playerState.bench[benchIndex];
      if (!blocker) continue;

      // Move to battlefield
      playerState.bench[benchIndex] = null;
      blocker.zone = 'battlefield';
      blocker.position = battlefieldIndex;
      blocker.isBlocking = true;
      blocker.blockedUnitId = assignment.attackerId;
      playerState.battlefield[battlefieldIndex] = blocker;
      battlefieldIndex++;

      // Update combat pair
      const combatPair = state.combatPairs.find(p => p.attackerId === assignment.attackerId);
      if (combatPair) {
        combatPair.blockerId = assignment.blockerId;
      }
    }

    this.recordAction(state, playerId, `declare_blockers:${blockAssignments.length}`);
    return state;
  }

  /**
   * Resolve combat and return units to bench
   */
  static resolveCombat(state: MatchState): MatchState {
    if (!state.combatPairs) return state;

    const attackingPlayer = state.players.find(p => state.playerStates[p].hasAttackToken);
    const defendingPlayer = state.players.find(p => !state.playerStates[p].hasAttackToken);
    
    if (!attackingPlayer || !defendingPlayer) return state;

    const attackerState = state.playerStates[attackingPlayer];
    const defenderState = state.playerStates[defendingPlayer];

    // Process each combat pair
    for (const pair of state.combatPairs) {
      const attacker = attackerState.battlefield.find(u => u?.id === pair.attackerId);
      if (!attacker) continue;

      if (pair.blockerId) {
        // Unit vs Unit combat
        const blocker = defenderState.battlefield.find(u => u?.id === pair.blockerId);
        if (!blocker) continue;

        // Apply damage simultaneously
        const attackerDamage = this.calculateDamage(attacker, blocker);
        const blockerDamage = this.calculateDamage(blocker, attacker);

        attacker.currentHealth -= blockerDamage;
        blocker.currentHealth -= attackerDamage;

        // Check for unit death
        if (attacker.currentHealth <= 0) {
          attackerState.discard.push(attacker.cardId);
        }
        if (blocker.currentHealth <= 0) {
          defenderState.discard.push(blocker.cardId);
        }
      } else {
        // Direct nexus damage
        defenderState.nexusHealth -= attacker.currentAttack;
      }

      // Mark attacker as having attacked
      attacker.hasAttacked = true;
      attacker.isAttacking = false;
    }

    // Return surviving units to bench
    this.returnUnitsToBench(attackerState);
    this.returnUnitsToBench(defenderState);

    // Clear combat state
    state.combatPairs = undefined;
    state.phase = 'main';

    return state;
  }

  /**
   * Return units from battlefield to bench after combat
   */
  private static returnUnitsToBench(playerState: PlayerState): void {
    for (let i = 0; i < playerState.battlefield.length; i++) {
      const unit = playerState.battlefield[i];
      if (unit && unit.currentHealth > 0) {
        // Find first empty bench slot
        const emptySlot = playerState.bench.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
          unit.zone = 'bench';
          unit.position = emptySlot;
          unit.isAttacking = false;
          unit.isBlocking = false;
          unit.blockedUnitId = undefined;
          playerState.bench[emptySlot] = unit;
        }
      }
      playerState.battlefield[i] = null;
    }
  }

  /**
   * Calculate damage considering keywords
   */
  private static calculateDamage(attacker: Unit, defender: Unit): number {
    let damage = attacker.currentAttack;

    // Apply keyword effects
    if (attacker.keywords.includes('overwhelm') && defender.currentHealth < damage) {
      // Overwhelm would deal excess to nexus (handled elsewhere)
    }

    if (defender.keywords.includes('tough')) {
      damage = Math.max(0, damage - 1);
    }

    if (defender.keywords.includes('barrier')) {
      return 0; // Barrier blocks all damage (one time)
    }

    return damage;
  }

  /**
   * Start turn - refresh mana and remove summoning sickness
   */
  static startTurn(state: MatchState): MatchState {
    const currentPlayer = state.playerStates[state.currentPlayer];
    
    // Increment mana (cap at 10)
    currentPlayer.maxMana = Math.min(10, currentPlayer.maxMana + 1);
    currentPlayer.mana = currentPlayer.maxMana;

    // Draw a card
    const rng = createSeededRandom(`${state.seed}:turn:${state.turn}`);
    let newState = this.drawCard(state, state.currentPlayer, rng);

    // Remove summoning sickness from bench units
    currentPlayer.bench.forEach(unit => {
      if (unit) {
        unit.canAttack = true;
        unit.hasAttacked = false;
      }
    });

    // Clear passed flags
    for (const playerId of state.players) {
      state.playerStates[playerId].passed = false;
    }

    newState.phase = 'main';
    this.recordAction(newState, state.currentPlayer, 'start_turn');

    return newState;
  }

  /**
   * End turn - bank mana and switch attack token
   */
  static endTurn(state: MatchState): MatchState {
    const currentPlayer = state.playerStates[state.currentPlayer];
    
    // Bank unused mana as spell mana (max 3)
    const unusedMana = currentPlayer.mana;
    currentPlayer.spellMana = Math.min(3, currentPlayer.spellMana + unusedMana);
    currentPlayer.mana = 0;

    // Switch attack token
    const currentIndex = state.players.indexOf(state.currentPlayer);
    const nextIndex = (currentIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextIndex];

    // Update attack tokens
    state.playerStates[state.currentPlayer].hasAttackToken = false;
    state.playerStates[nextPlayer].hasAttackToken = true;
    state.attackToken = nextPlayer;

    // Update turn and current player
    let newState: MatchState = {
      ...state,
      turn: state.turn + 1,
      currentPlayer: nextPlayer,
      phase: 'draw'
    };

    // Start next turn
    newState = this.startTurn(newState);
    this.recordAction(newState, state.currentPlayer, 'end_turn');

    return newState;
  }

  /**
   * Check for victory conditions
   */
  static checkVictory(state: MatchState): string | null {
    for (const playerId of state.players) {
      if (state.playerStates[playerId].nexusHealth <= 0) {
        // Return the opponent as winner
        return state.players.find(p => p !== playerId) || null;
      }
    }
    return null;
  }

  private static drawCard(state: MatchState, playerId: string, rng: any): MatchState {
    const playerState = state.playerStates[playerId];
    
    if (playerState.deck.length === 0) {
      // Deck out - could trigger loss condition
      return state;
    }

    // Draw from top of deck
    const cardId = playerState.deck.shift()!;
    playerState.hand.push(cardId);

    // Hand size limit (10 cards)
    if (playerState.hand.length > 10) {
      const discarded = playerState.hand.pop()!;
      playerState.discard.push(discarded);
    }

    return state;
  }

  private static recordAction(state: MatchState, playerId: string, action: string): void {
    state.actionHistory.push({
      playerId,
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Process a player action
   */
  static processAction(state: MatchState, action: any): MatchState {
    switch (action.type) {
      case 'play_card':
        return this.playCard(state, action.playerId, action.cardId);
      
      case 'declare_attackers':
        return this.declareAttackers(state, action.playerId, action.attackerIds);
      
      case 'declare_blockers':
        return this.declareBlockers(state, action.playerId, action.blockAssignments);
      
      case 'resolve_combat':
        return this.resolveCombat(state);
      
      case 'pass':
        state.playerStates[action.playerId].passed = true;
        // If both pass, resolve current phase
        if (state.players.every(p => state.playerStates[p].passed)) {
          if (state.phase === 'combat') {
            return this.resolveCombat(state);
          }
          return this.endTurn(state);
        }
        return state;
      
      case 'end_turn':
        return this.endTurn(state);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
}