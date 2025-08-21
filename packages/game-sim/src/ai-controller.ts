import type { MatchState, Unit, CardDefinition, PlayerState } from './types.js';
import { TarotLorSimulator } from './tarot-lor-simulator.js';
import { CombatSystem } from './combat.js';
import { KeywordProcessor } from './keywords.js';

interface Move {
  type: 'play_card' | 'attack' | 'block' | 'pass' | 'end_turn';
  score: number;
  details?: any;
}

interface BoardEvaluation {
  boardControl: number;
  cardAdvantage: number;
  healthDifferential: number;
  manaEfficiency: number;
  tempoAdvantage: number;
  totalScore: number;
}

export class AIController {
  private difficulty: 'easy' | 'medium' | 'hard';
  private evaluationWeights: Record<string, number>;

  constructor(difficulty: 'medium' | 'easy' | 'hard' = 'medium') {
    this.difficulty = difficulty;
    
    // Adjust weights based on difficulty
    this.evaluationWeights = this.getWeightsForDifficulty(difficulty);
  }

  private getWeightsForDifficulty(difficulty: string): Record<string, number> {
    switch (difficulty) {
      case 'easy':
        return {
          boardControl: 0.2,
          cardAdvantage: 0.1,
          healthDifferential: 0.3,
          manaEfficiency: 0.2,
          tempoAdvantage: 0.2
        };
      case 'hard':
        return {
          boardControl: 0.35,
          cardAdvantage: 0.25,
          healthDifferential: 0.15,
          manaEfficiency: 0.15,
          tempoAdvantage: 0.1
        };
      default: // medium
        return {
          boardControl: 0.3,
          cardAdvantage: 0.2,
          healthDifferential: 0.2,
          manaEfficiency: 0.15,
          tempoAdvantage: 0.15
        };
    }
  }

  /**
   * Main entry point - AI takes its turn
   */
  takeTurn(state: MatchState, aiPlayerId: string): Move {
    const moves = this.generatePossibleMoves(state, aiPlayerId);
    
    if (moves.length === 0) {
      return { type: 'pass', score: 0 };
    }

    // Evaluate each move
    const evaluatedMoves = moves.map(move => ({
      ...move,
      score: this.evaluateMove(state, move, aiPlayerId)
    }));

    // Sort by score
    evaluatedMoves.sort((a, b) => b.score - a.score);

    // Add randomization based on difficulty
    return this.selectMove(evaluatedMoves);
  }

  /**
   * Generate all possible moves
   */
  private generatePossibleMoves(state: MatchState, playerId: string): Move[] {
    const moves: Move[] = [];
    const playerState = state.playerStates[playerId];

    // Generate card play moves
    moves.push(...this.generateCardPlayMoves(state, playerState));

    // Generate attack moves
    if (playerState.hasAttackToken && state.phase === 'main') {
      moves.push(...this.generateAttackMoves(state, playerState));
    }

    // Generate block moves
    if (state.combatPairs && state.phase === 'combat') {
      moves.push(...this.generateBlockMoves(state, playerState));
    }

    // Always can pass
    moves.push({ type: 'pass', score: 0 });

    // Can end turn if in main phase
    if (state.phase === 'main' && state.currentPlayer === playerId) {
      moves.push({ type: 'end_turn', score: 0 });
    }

    return moves;
  }

  /**
   * Generate card play moves
   */
  private generateCardPlayMoves(state: MatchState, playerState: PlayerState): Move[] {
    const moves: Move[] = [];
    const totalMana = playerState.mana + playerState.spellMana;

    for (const cardId of playerState.hand) {
      const card = state.cardLibrary[cardId];
      if (!card || card.cost > totalMana) continue;

      if (card.type === 'unit') {
        // Try each empty lane
        for (let lane = 0; lane < 3; lane++) {
          if (playerState.board[lane] === null) {
            moves.push({
              type: 'play_card',
              score: 0,
              details: { cardId, lane }
            });
          }
        }
      } else {
        // Spell cards
        moves.push({
          type: 'play_card',
          score: 0,
          details: { cardId }
        });
      }
    }

    return moves;
  }

  /**
   * Generate attack moves
   */
  private generateAttackMoves(state: MatchState, playerState: PlayerState): Move[] {
    const moves: Move[] = [];
    const availableAttackers = playerState.board
      .filter(unit => unit && unit.canAttack && !unit.hasAttacked)
      .map(unit => unit!.id);

    if (availableAttackers.length === 0) return moves;

    // Generate various attack combinations
    // For simplicity, we'll generate: all attack, none attack, and each individually
    
    // All units attack
    if (availableAttackers.length > 0) {
      moves.push({
        type: 'attack',
        score: 0,
        details: { attackerIds: availableAttackers }
      });
    }

    // Each unit attacks alone
    for (const attackerId of availableAttackers) {
      moves.push({
        type: 'attack',
        score: 0,
        details: { attackerIds: [attackerId] }
      });
    }

    // Combinations of 2 (if 3+ units)
    if (availableAttackers.length >= 3) {
      for (let i = 0; i < availableAttackers.length; i++) {
        for (let j = i + 1; j < availableAttackers.length; j++) {
          moves.push({
            type: 'attack',
            score: 0,
            details: { attackerIds: [availableAttackers[i], availableAttackers[j]] }
          });
        }
      }
    }

    return moves;
  }

  /**
   * Generate block moves
   */
  private generateBlockMoves(state: MatchState, playerState: PlayerState): Move[] {
    const moves: Move[] = [];
    if (!state.combatPairs) return moves;

    const availableBlockers = playerState.board
      .filter(unit => unit && !unit.isBlocking)
      .map(unit => unit!);

    const unblocked = state.combatPairs.filter(pair => !pair.blockerId);

    // Generate various blocking combinations
    // For now, simple 1-to-1 optimal blocking
    const blockAssignments: Array<{ blockerId: string; attackerId: string }> = [];

    for (const pair of unblocked) {
      const attacker = this.findUnitById(state, pair.attackerId);
      if (!attacker) continue;

      // Find best blocker
      const bestBlocker = this.findBestBlocker(availableBlockers, attacker);
      if (bestBlocker) {
        blockAssignments.push({
          blockerId: bestBlocker.id,
          attackerId: pair.attackerId
        });
        // Remove from available
        availableBlockers.splice(availableBlockers.indexOf(bestBlocker), 1);
      }
    }

    if (blockAssignments.length > 0) {
      moves.push({
        type: 'block',
        score: 0,
        details: { blockAssignments }
      });
    }

    // Also consider not blocking at all
    moves.push({
      type: 'pass',
      score: 0
    });

    return moves;
  }

  /**
   * Find best blocker for an attacker
   */
  private findBestBlocker(blockers: Unit[], attacker: Unit): Unit | null {
    let bestBlocker: Unit | null = null;
    let bestScore = -Infinity;

    for (const blocker of blockers) {
      // Check if can block (keywords)
      if (!KeywordProcessor.canBlock(attacker, blocker)) continue;

      let score = 0;

      // Prefer favorable trades
      if (blocker.currentAttack >= attacker.currentHealth) {
        score += 10; // Will kill attacker
      }
      if (attacker.currentAttack < blocker.currentHealth) {
        score += 5; // Will survive
      }
      
      // Avoid bad trades
      if (attacker.currentAttack >= blocker.currentHealth && blocker.currentAttack < attacker.currentHealth) {
        score -= 10; // Will die without killing
      }

      // Consider unit value
      score -= blocker.currentAttack + blocker.currentHealth; // Prefer blocking with weaker units

      if (score > bestScore) {
        bestScore = score;
        bestBlocker = blocker;
      }
    }

    return bestBlocker;
  }

  /**
   * Evaluate a move
   */
  private evaluateMove(state: MatchState, move: Move, playerId: string): number {
    // Simulate the move
    let futureState: MatchState;
    try {
      futureState = this.simulateMove(state, move, playerId);
    } catch (e) {
      // Invalid move
      return -1000;
    }

    // Evaluate the resulting board state
    const evaluation = this.evaluateBoard(futureState, playerId);
    
    // Add move-specific bonuses
    let bonus = 0;
    
    if (move.type === 'play_card') {
      bonus += 5; // Encourage playing cards
      const card = state.cardLibrary[move.details.cardId];
      if (card?.type === 'unit') {
        bonus += 10; // Units are valuable
      }
    }
    
    if (move.type === 'attack') {
      bonus += 3 * move.details.attackerIds.length; // Encourage attacks
    }

    return evaluation.totalScore + bonus;
  }

  /**
   * Simulate a move without modifying original state
   */
  private simulateMove(state: MatchState, move: Move, playerId: string): MatchState {
    // Deep copy state (simplified - real implementation needs proper deep copy)
    const stateCopy = JSON.parse(JSON.stringify(state));

    switch (move.type) {
      case 'play_card':
        return TarotLorSimulator.playCard(stateCopy, playerId, move.details.cardId);
      
      case 'attack':
        return CombatSystem.declareAttackers(stateCopy, playerId, move.details.attackerIds);
      
      case 'block':
        return CombatSystem.declareBlockers(stateCopy, playerId, move.details.blockAssignments);
      
      case 'pass':
        return TarotLorSimulator.processAction(stateCopy, { type: 'pass', playerId });
      
      case 'end_turn':
        return TarotLorSimulator.endTurn(stateCopy);
      
      default:
        return stateCopy;
    }
  }

  /**
   * Evaluate board state
   */
  evaluateBoard(state: MatchState, playerId: string): BoardEvaluation {
    const myState = state.playerStates[playerId];
    const opponentId = state.players.find(p => p !== playerId)!;
    const oppState = state.playerStates[opponentId];

    // Board Control
    const myUnits = myState.board.filter(u => u);
    const oppUnits = oppState.board.filter(u => u);
    const boardControl = (myUnits.length - oppUnits.length) * 10 +
      myUnits.reduce((sum, u) => sum + (u?.currentAttack || 0) + (u?.currentHealth || 0), 0) -
      oppUnits.reduce((sum, u) => sum + (u?.currentAttack || 0) + (u?.currentHealth || 0), 0);

    // Card Advantage
    const cardAdvantage = (myState.hand.length - oppState.hand.length) * 5;

    // Health Differential
    const healthDifferential = (myState.nexusHealth - oppState.nexusHealth) * 3;

    // Mana Efficiency
    const manaEfficiency = -(myState.mana + myState.spellMana) * 2; // Penalty for unspent mana

    // Tempo Advantage
    const tempoAdvantage = myState.hasAttackToken ? 10 : 0;

    // Calculate weighted total
    const totalScore = 
      boardControl * this.evaluationWeights.boardControl +
      cardAdvantage * this.evaluationWeights.cardAdvantage +
      healthDifferential * this.evaluationWeights.healthDifferential +
      manaEfficiency * this.evaluationWeights.manaEfficiency +
      tempoAdvantage * this.evaluationWeights.tempoAdvantage;

    return {
      boardControl,
      cardAdvantage,
      healthDifferential,
      manaEfficiency,
      tempoAdvantage,
      totalScore
    };
  }

  /**
   * Select move based on difficulty
   */
  private selectMove(evaluatedMoves: Move[]): Move {
    if (evaluatedMoves.length === 0) {
      return { type: 'pass', score: 0 };
    }

    switch (this.difficulty) {
      case 'easy':
        // Random from top 50%
        const topHalf = Math.ceil(evaluatedMoves.length / 2);
        const randomIndex = Math.floor(Math.random() * topHalf);
        return evaluatedMoves[randomIndex];
      
      case 'hard':
        // Always best move
        return evaluatedMoves[0];
      
      default: // medium
        // 70% chance best move, 30% chance second best
        if (Math.random() < 0.7 || evaluatedMoves.length === 1) {
          return evaluatedMoves[0];
        }
        return evaluatedMoves[1];
    }
  }

  /**
   * Helper to find unit by ID
   */
  private findUnitById(state: MatchState, unitId: string): Unit | undefined {
    for (const playerId of state.players) {
      const unit = state.playerStates[playerId].board.find(u => u?.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  }
}