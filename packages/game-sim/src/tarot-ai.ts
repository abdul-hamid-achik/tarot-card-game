import { MatchState } from './types';
import { applyIntent, checkVictory } from './sim';
import { createSeededRandom } from './rng';

export interface TarotAIConfig {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  personality: 'aggressive' | 'defensive' | 'balanced' | 'chaotic';
  deck?: string[];
}

export interface AIDecision {
  action: string;
  cardId?: string;
  laneIndex?: number;
  targetId?: string;
  confidence: number;
  reasoning: string;
}

export class TarotAI {
  private difficulty: TarotAIConfig['difficulty'];
  private personality: TarotAIConfig['personality'];
  private deck: string[];
  private rng: ReturnType<typeof createSeededRandom>;

  constructor(config: TarotAIConfig, seed: string) {
    this.difficulty = config.difficulty;
    this.personality = config.personality;
    this.deck = config.deck || this.generateDefaultDeck();
    this.rng = createSeededRandom(seed);
  }

  /**
   * Main decision function - AI evaluates game state and chooses best action
   */
  public chooseAction(state: MatchState, playerId: string): AIDecision {
    const analysis = this.analyzeGameState(state, playerId);
    
    // Different strategies based on difficulty
    switch (this.difficulty) {
      case 'easy':
        return this.easyStrategy(state, playerId, analysis);
      case 'medium':
        return this.mediumStrategy(state, playerId, analysis);
      case 'hard':
        return this.hardStrategy(state, playerId, analysis);
      case 'expert':
        return this.expertStrategy(state, playerId, analysis);
      default:
        return this.mediumStrategy(state, playerId, analysis);
    }
  }

  /**
   * Analyze the current game state
   */
  private analyzeGameState(state: MatchState, playerId: string): GameAnalysis {
    const opponentId = state.players.find(p => p !== playerId) || '';
    const player = this.getPlayerState(state, playerId);
    const opponent = this.getPlayerState(state, opponentId);

    return {
      playerHealth: player.health,
      opponentHealth: opponent.health,
      playerFate: player.fate,
      opponentFate: opponent.fate,
      playerHand: player.hand,
      playerLanes: player.lanes,
      opponentLanes: opponent.lanes,
      arcanaTrials: state.arcanaTrials || { sun: 0, moon: 0, judgement: 0 },
      majorArcanaCharge: state.majorArcanaCharge?.[playerId] || 0,
      turn: state.turn,
      reactionWindowOpen: state.reactionWindow?.open || false,
      spreadSlots: state.spreadSlots || { past: null, present: null, future: null },
      cardOrientations: state.cardOrientations || {},
      threatLevel: this.calculateThreatLevel(state, playerId, opponentId),
      winConditionProgress: this.evaluateWinConditions(state, playerId)
    };
  }

  /**
   * Easy AI - Makes random valid moves
   */
  private easyStrategy(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    const hand = analysis.playerHand;
    
    if (hand.length === 0) {
      return {
        action: 'end_turn',
        confidence: 0.3,
        reasoning: 'No cards to play'
      };
    }

    // Random card selection
    const cardIndex = Math.floor(this.rng.next() * hand.length);
    const cardId = hand[cardIndex];
    const laneIndex = Math.floor(this.rng.next() * 6);

    return {
      action: 'play_card',
      cardId,
      laneIndex,
      confidence: 0.4,
      reasoning: 'Playing random card'
    };
  }

  /**
   * Medium AI - Basic strategy with some tactics
   */
  private mediumStrategy(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Check for reaction window opportunities
    if (analysis.reactionWindowOpen && analysis.playerFate >= 1) {
      return this.chooseFateAction(state, playerId, analysis);
    }

    // Prioritize Major Arcana if charge is close to ultimate
    if (analysis.majorArcanaCharge >= 90) {
      const majorCard = analysis.playerHand.find(c => c.startsWith('major_'));
      if (majorCard) {
        return {
          action: 'play_card',
          cardId: majorCard,
          laneIndex: this.chooseBestLane(analysis),
          confidence: 0.8,
          reasoning: 'Playing Major Arcana to activate ultimate'
        };
      }
    }

    // Basic card evaluation
    const bestPlay = this.evaluateCardPlays(state, playerId, analysis);
    
    if (bestPlay) {
      return bestPlay;
    }

    // Channel cards for combo
    if (analysis.playerHand.length > 3 && this.rng.next() > 0.5) {
      const cardToChannel = analysis.playerHand[0];
      return {
        action: 'channel',
        cardId: cardToChannel,
        confidence: 0.6,
        reasoning: 'Building channeling combo'
      };
    }

    return {
      action: 'end_turn',
      confidence: 0.5,
      reasoning: 'No good plays available'
    };
  }

  /**
   * Hard AI - Advanced tactics and combos
   */
  private hardStrategy(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Priority 1: Win condition checks
    if (this.canWinThisTurn(state, playerId, analysis)) {
      return this.executeWinningMove(state, playerId, analysis);
    }

    // Priority 2: Prevent opponent victory
    if (this.opponentCanWinNextTurn(state, playerId, analysis)) {
      return this.executeDefensiveMove(state, playerId, analysis);
    }

    // Priority 3: Optimize Arcana Trials
    const trialPlay = this.optimizeTrialProgress(state, playerId, analysis);
    if (trialPlay && trialPlay.confidence > 0.7) {
      return trialPlay;
    }

    // Priority 4: Spread optimization based on turn
    const spreadPlay = this.optimizeSpreadPlacement(state, playerId, analysis);
    if (spreadPlay && spreadPlay.confidence > 0.6) {
      return spreadPlay;
    }

    // Priority 5: Elemental combos
    const elementalCombo = this.findElementalCombo(state, playerId, analysis);
    if (elementalCombo) {
      return elementalCombo;
    }

    return this.mediumStrategy(state, playerId, analysis);
  }

  /**
   * Expert AI - Near-perfect play with deck-specific strategies
   */
  private expertStrategy(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Deck archetype recognition and specialized strategies
    const deckType = this.identifyDeckArchetype(analysis.playerHand);
    
    switch (deckType) {
      case 'wands_aggro':
        return this.executeWandsAggro(state, playerId, analysis);
      case 'cups_control':
        return this.executeCupsControl(state, playerId, analysis);
      case 'swords_counter':
        return this.executeSwordsCounter(state, playerId, analysis);
      case 'pentacles_defense':
        return this.executePentaclesDefense(state, playerId, analysis);
      case 'major_ultimate':
        return this.executeMajorUltimate(state, playerId, analysis);
      default:
        return this.hardStrategy(state, playerId, analysis);
    }
  }

  /**
   * Choose fate action during reaction window
   */
  private chooseFateAction(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    const fate = analysis.playerFate;

    // Divine Intervention if we can afford it and need it
    if (fate >= 3 && analysis.threatLevel > 0.8) {
      return {
        action: 'divine_intervention',
        confidence: 0.9,
        reasoning: 'Canceling dangerous play with Divine Intervention'
      };
    }

    // Force draw if opponent has few cards
    if (fate >= 2 && analysis.opponentHand.length <= 2) {
      return {
        action: 'force_draw',
        confidence: 0.7,
        reasoning: 'Forcing opponent to draw'
      };
    }

    // Flip orientation on powerful cards
    const dangerousCard = this.findMostDangerousCard(state, playerId);
    if (fate >= 1 && dangerousCard) {
      return {
        action: 'flip_orientation',
        targetId: dangerousCard,
        confidence: 0.8,
        reasoning: 'Flipping dangerous card orientation'
      };
    }

    // Peek if nothing else
    if (fate >= 1) {
      return {
        action: 'peek',
        confidence: 0.5,
        reasoning: 'Peeking at top cards'
      };
    }

    return {
      action: 'pass',
      confidence: 0.3,
      reasoning: 'No fate action needed'
    };
  }

  /**
   * Evaluate all possible card plays
   */
  private evaluateCardPlays(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision | null {
    const plays: AIDecision[] = [];

    for (const cardId of analysis.playerHand) {
      const cardValue = this.evaluateCard(cardId, state, analysis);
      
      for (let lane = 0; lane < 6; lane++) {
        const laneValue = this.evaluateLane(lane, analysis);
        const totalValue = cardValue * laneValue;

        plays.push({
          action: 'play_card',
          cardId,
          laneIndex: lane,
          confidence: Math.min(totalValue, 1),
          reasoning: `Playing ${cardId} in lane ${lane}`
        });
      }
    }

    // Sort by confidence and return best play
    plays.sort((a, b) => b.confidence - a.confidence);
    
    if (plays.length > 0 && plays[0].confidence > 0.5) {
      return plays[0];
    }

    return null;
  }

  /**
   * Evaluate card value based on game state
   */
  private evaluateCard(cardId: string, state: MatchState, analysis: GameAnalysis): number {
    let value = 0.5; // Base value

    // Major Arcana are more valuable
    if (cardId.startsWith('major_')) {
      value += 0.2;
      
      // Even more valuable when charge is high
      if (analysis.majorArcanaCharge >= 70) {
        value += 0.3;
      }
    }

    // Suit synergies
    const suit = this.getCardSuit(cardId);
    switch (suit) {
      case 'wands':
        // Valuable when opponent is low health
        if (analysis.opponentHealth < 15) value += 0.3;
        break;
      case 'cups':
        // Valuable when we're low health
        if (analysis.playerHealth < 15) value += 0.3;
        break;
      case 'swords':
        // Valuable when opponent has many cards on board
        if (analysis.opponentLanes.filter(l => l).length > 3) value += 0.2;
        break;
      case 'pentacles':
        // Valuable when defending
        if (analysis.threatLevel > 0.6) value += 0.2;
        break;
    }

    // Orientation consideration
    const orientation = analysis.cardOrientations[cardId] || 'upright';
    if (orientation === 'reversed') {
      value *= 0.7; // Reversed cards are generally weaker
    }

    return value;
  }

  /**
   * Calculate threat level from opponent
   */
  private calculateThreatLevel(state: MatchState, playerId: string, opponentId: string): number {
    const opponent = this.getPlayerState(state, opponentId);
    let threat = 0;

    // Health differential
    const player = this.getPlayerState(state, playerId);
    const healthDiff = opponent.health - player.health;
    threat += Math.max(0, healthDiff / 30) * 0.3;

    // Board presence
    const opponentCards = opponent.lanes.filter(l => l).length;
    threat += (opponentCards / 6) * 0.3;

    // Trial progress
    const trials = state.arcanaTrials || { sun: 0, moon: 0, judgement: 0 };
    const maxTrial = Math.max(trials.sun, trials.moon, trials.judgement);
    threat += (maxTrial / 100) * 0.4;

    return Math.min(threat, 1);
  }

  /**
   * Deck archetype strategies
   */
  private executeWandsAggro(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Aggressive strategy - maximize damage
    const wandsCards = analysis.playerHand.filter(c => c.includes('wands'));
    
    if (wandsCards.length > 0) {
      // Find empty opponent lane for direct damage
      const emptyLane = this.findEmptyOpponentLane(analysis);
      
      return {
        action: 'play_card',
        cardId: wandsCards[0],
        laneIndex: emptyLane,
        confidence: 0.9,
        reasoning: 'Wands aggro - maximizing burn damage'
      };
    }

    return this.hardStrategy(state, playerId, analysis);
  }

  private executeCupsControl(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Control strategy - heal and outlast
    const cupsCards = analysis.playerHand.filter(c => c.includes('cups'));
    
    if (analysis.playerHealth < 20 && cupsCards.length > 0) {
      return {
        action: 'play_card',
        cardId: cupsCards[0],
        laneIndex: this.chooseSafestLane(analysis),
        confidence: 0.85,
        reasoning: 'Cups control - healing and sustaining'
      };
    }

    // Use fate for control
    if (analysis.playerFate >= 2 && analysis.reactionWindowOpen) {
      return {
        action: 'force_draw',
        confidence: 0.8,
        reasoning: 'Cups control - disrupting opponent'
      };
    }

    return this.hardStrategy(state, playerId, analysis);
  }

  private executeSwordsCounter(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Counter strategy - react to opponent plays
    const swordsCards = analysis.playerHand.filter(c => c.includes('swords'));
    
    // Counter strongest opponent lane
    const strongestLane = this.findStrongestOpponentLane(analysis);
    
    if (swordsCards.length > 0 && strongestLane !== -1) {
      return {
        action: 'play_card',
        cardId: swordsCards[0],
        laneIndex: strongestLane,
        confidence: 0.88,
        reasoning: 'Swords counter - neutralizing threats'
      };
    }

    return this.hardStrategy(state, playerId, analysis);
  }

  private executePentaclesDefense(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Defensive strategy - build shields and survive
    const pentaclesCards = analysis.playerHand.filter(c => c.includes('pentacles'));
    
    if (pentaclesCards.length > 0) {
      // Protect weakest lane
      const weakestLane = this.findWeakestPlayerLane(analysis);
      
      return {
        action: 'play_card',
        cardId: pentaclesCards[0],
        laneIndex: weakestLane,
        confidence: 0.82,
        reasoning: 'Pentacles defense - building shields'
      };
    }

    return this.hardStrategy(state, playerId, analysis);
  }

  private executeMajorUltimate(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Ultimate strategy - charge and unleash Major Arcana
    const majorCards = analysis.playerHand.filter(c => c.startsWith('major_'));
    
    // Play Major Arcana to charge
    if (majorCards.length > 0) {
      if (analysis.majorArcanaCharge >= 90) {
        // Ultimate is ready!
        return {
          action: 'activate_ultimate',
          cardId: majorCards[0],
          confidence: 1.0,
          reasoning: 'Activating Major Arcana Ultimate!'
        };
      }
      
      return {
        action: 'play_card',
        cardId: majorCards[0],
        laneIndex: this.chooseBestLane(analysis),
        confidence: 0.9,
        reasoning: 'Charging Major Arcana ultimate'
      };
    }

    return this.hardStrategy(state, playerId, analysis);
  }

  /**
   * Helper functions
   */
  private getPlayerState(state: MatchState, playerId: string): any {
    // Extract player state from match state
    return {
      health: state.players?.[playerId]?.health || 30,
      fate: state.fate?.[playerId] || 0,
      hand: state.hands?.[playerId]?.hand || [],
      lanes: state.battlefield?.[playerId] || Array(6).fill(null)
    };
  }

  private chooseBestLane(analysis: GameAnalysis): number {
    // Find best lane based on current board state
    for (let i = 0; i < 6; i++) {
      if (!analysis.playerLanes[i] && !analysis.opponentLanes[i]) {
        return i; // Empty lane
      }
    }
    return Math.floor(Math.random() * 6);
  }

  private findEmptyOpponentLane(analysis: GameAnalysis): number {
    for (let i = 0; i < 6; i++) {
      if (!analysis.opponentLanes[i]) {
        return i;
      }
    }
    return 0;
  }

  private chooseSafestLane(analysis: GameAnalysis): number {
    // Find lane with least threat
    for (let i = 0; i < 6; i++) {
      if (!analysis.opponentLanes[i]) {
        return i;
      }
    }
    return 5; // Default to last lane
  }

  private findStrongestOpponentLane(analysis: GameAnalysis): number {
    // Find opponent's strongest card
    let strongest = -1;
    let maxPower = 0;
    
    for (let i = 0; i < 6; i++) {
      if (analysis.opponentLanes[i]?.power > maxPower) {
        strongest = i;
        maxPower = analysis.opponentLanes[i].power;
      }
    }
    
    return strongest;
  }

  private findWeakestPlayerLane(analysis: GameAnalysis): number {
    for (let i = 0; i < 6; i++) {
      if (!analysis.playerLanes[i]) {
        return i;
      }
    }
    return 0;
  }

  private evaluateLane(lane: number, analysis: GameAnalysis): number {
    let value = 0.5;
    
    // Empty lanes are valuable
    if (!analysis.playerLanes[lane]) {
      value += 0.2;
    }
    
    // Lanes opposite to opponent cards are important
    if (analysis.opponentLanes[lane]) {
      value += 0.15;
    }
    
    return value;
  }

  private canWinThisTurn(state: MatchState, playerId: string, analysis: GameAnalysis): boolean {
    // Check if we can achieve any victory condition this turn
    
    // Health victory
    if (analysis.opponentHealth <= 5) {
      return true;
    }
    
    // Trials victory
    const trials = analysis.arcanaTrials;
    const completedTrials = [trials.sun >= 100, trials.moon >= 100, trials.judgement >= 100]
      .filter(t => t).length;
    if (completedTrials >= 2) {
      return true;
    }
    
    return false;
  }

  private opponentCanWinNextTurn(state: MatchState, playerId: string, analysis: GameAnalysis): boolean {
    // Check if opponent is close to victory
    
    if (analysis.playerHealth <= 10) {
      return true;
    }
    
    const trials = analysis.arcanaTrials;
    const highTrials = [trials.sun >= 90, trials.moon >= 90, trials.judgement >= 90]
      .filter(t => t).length;
    if (highTrials >= 2) {
      return true;
    }
    
    return false;
  }

  private executeWinningMove(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Execute the move that wins the game
    
    // Find highest damage card
    const damageCards = analysis.playerHand.filter(c => 
      c.includes('wands') || c.includes('swords')
    );
    
    if (damageCards.length > 0) {
      return {
        action: 'play_card',
        cardId: damageCards[0],
        laneIndex: this.findEmptyOpponentLane(analysis),
        confidence: 1.0,
        reasoning: 'Executing winning move!'
      };
    }
    
    return this.hardStrategy(state, playerId, analysis);
  }

  private executeDefensiveMove(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision {
    // Prevent opponent from winning
    
    // Heal if possible
    const healCards = analysis.playerHand.filter(c => c.includes('cups'));
    if (healCards.length > 0) {
      return {
        action: 'play_card',
        cardId: healCards[0],
        laneIndex: this.chooseSafestLane(analysis),
        confidence: 0.95,
        reasoning: 'Emergency healing to prevent loss'
      };
    }
    
    // Shield if possible
    const shieldCards = analysis.playerHand.filter(c => c.includes('pentacles'));
    if (shieldCards.length > 0) {
      return {
        action: 'play_card',
        cardId: shieldCards[0],
        laneIndex: this.findStrongestOpponentLane(analysis),
        confidence: 0.9,
        reasoning: 'Emergency shield to block damage'
      };
    }
    
    // Use fate defensively
    if (analysis.playerFate >= 3 && analysis.reactionWindowOpen) {
      return {
        action: 'divine_intervention',
        confidence: 0.95,
        reasoning: 'Divine Intervention to prevent loss'
      };
    }
    
    return this.hardStrategy(state, playerId, analysis);
  }

  private optimizeTrialProgress(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision | null {
    const trials = analysis.arcanaTrials;
    
    // Focus on the closest trial to completion
    let targetTrial = 'sun';
    let maxProgress = trials.sun;
    
    if (trials.moon > maxProgress) {
      targetTrial = 'moon';
      maxProgress = trials.moon;
    }
    
    if (trials.judgement > maxProgress) {
      targetTrial = 'judgement';
      maxProgress = trials.judgement;
    }
    
    // Play cards that advance the target trial
    if (targetTrial === 'sun') {
      const fireCards = analysis.playerHand.filter(c => c.includes('wands'));
      if (fireCards.length > 0) {
        return {
          action: 'play_card',
          cardId: fireCards[0],
          laneIndex: this.findEmptyOpponentLane(analysis),
          confidence: 0.8,
          reasoning: `Advancing Sun trial (${trials.sun}/100)`
        };
      }
    }
    
    return null;
  }

  private optimizeSpreadPlacement(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision | null {
    const turn = analysis.turn;
    const spread = analysis.spreadSlots;
    
    // Past bonus (turns 1-3)
    if (turn <= 3 && !spread.past) {
      const bestCard = this.findBestSpreadCard(analysis.playerHand);
      if (bestCard) {
        return {
          action: 'assign_spread',
          cardId: bestCard,
          targetId: 'past',
          confidence: 0.7,
          reasoning: 'Placing card in Past spread slot for bonus'
        };
      }
    }
    
    // Present bonus (turns 4-6)
    if (turn >= 4 && turn <= 6 && !spread.present) {
      const bestCard = this.findBestSpreadCard(analysis.playerHand);
      if (bestCard) {
        return {
          action: 'assign_spread',
          cardId: bestCard,
          targetId: 'present',
          confidence: 0.7,
          reasoning: 'Placing card in Present spread slot for bonus'
        };
      }
    }
    
    // Future bonus (turns 7+)
    if (turn >= 7 && !spread.future) {
      const bestCard = this.findBestSpreadCard(analysis.playerHand);
      if (bestCard) {
        return {
          action: 'assign_spread',
          cardId: bestCard,
          targetId: 'future',
          confidence: 0.7,
          reasoning: 'Placing card in Future spread slot for bonus'
        };
      }
    }
    
    return null;
  }

  private findElementalCombo(state: MatchState, playerId: string, analysis: GameAnalysis): AIDecision | null {
    // Look for elemental advantage opportunities
    
    // Check opponent's last played card element
    const opponentCards = analysis.opponentLanes.filter(l => l);
    if (opponentCards.length === 0) return null;
    
    const lastOpponentElement = this.getCardElement(opponentCards[0]?.cardId);
    const counterElement = this.getCounterElement(lastOpponentElement);
    
    // Find cards with counter element
    const counterCards = analysis.playerHand.filter(c => 
      this.getCardElement(c) === counterElement
    );
    
    if (counterCards.length > 0) {
      return {
        action: 'play_card',
        cardId: counterCards[0],
        laneIndex: 0, // Lane where opponent card is
        confidence: 0.75,
        reasoning: `Playing ${counterElement} to counter ${lastOpponentElement}`
      };
    }
    
    return null;
  }

  private findMostDangerousCard(state: MatchState, playerId: string): string | null {
    // Find the most threatening card on the board
    // This would need access to actual board state
    return null;
  }

  private findBestSpreadCard(hand: string[]): string | null {
    // Major Arcana are best for spread slots
    const majorCard = hand.find(c => c.startsWith('major_'));
    if (majorCard) return majorCard;
    
    // Otherwise any card
    return hand.length > 0 ? hand[0] : null;
  }

  private getCardSuit(cardId: string): string {
    if (cardId.includes('wands')) return 'wands';
    if (cardId.includes('cups')) return 'cups';
    if (cardId.includes('swords')) return 'swords';
    if (cardId.includes('pentacles')) return 'pentacles';
    if (cardId.startsWith('major_')) return 'major';
    return 'unknown';
  }

  private getCardElement(cardId: string): string {
    const suit = this.getCardSuit(cardId);
    switch (suit) {
      case 'wands': return 'fire';
      case 'cups': return 'water';
      case 'swords': return 'air';
      case 'pentacles': return 'earth';
      default: return 'neutral';
    }
  }

  private getCounterElement(element: string): string {
    switch (element) {
      case 'fire': return 'water';
      case 'water': return 'earth';
      case 'air': return 'fire';
      case 'earth': return 'air';
      default: return 'neutral';
    }
  }

  private identifyDeckArchetype(hand: string[]): string {
    const suitCounts = {
      wands: 0,
      cups: 0,
      swords: 0,
      pentacles: 0,
      major: 0
    };
    
    for (const card of hand) {
      const suit = this.getCardSuit(card);
      suitCounts[suit]++;
    }
    
    // Find dominant suit
    let maxSuit = 'balanced';
    let maxCount = 0;
    
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSuit = suit;
      }
    }
    
    // Map to archetype
    switch (maxSuit) {
      case 'wands': return 'wands_aggro';
      case 'cups': return 'cups_control';
      case 'swords': return 'swords_counter';
      case 'pentacles': return 'pentacles_defense';
      case 'major': return 'major_ultimate';
      default: return 'balanced';
    }
  }

  private evaluateWinConditions(state: MatchState, playerId: string): WinConditionProgress {
    const player = this.getPlayerState(state, playerId);
    const opponent = this.getPlayerState(state, this.getOpponentId(state, playerId));
    const trials = state.arcanaTrials || { sun: 0, moon: 0, judgement: 0 };
    
    return {
      healthVictory: (30 - opponent.health) / 30,
      trialsVictory: Math.max(trials.sun, trials.moon, trials.judgement) / 100,
      deckOutVictory: opponent.hand.length === 0 ? 1 : 0
    };
  }

  private getOpponentId(state: MatchState, playerId: string): string {
    return state.players.find(p => p !== playerId) || '';
  }

  private generateDefaultDeck(): string[] {
    // Generate a balanced default deck
    return [
      'major_00', 'major_01',
      ...Array.from({ length: 7 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 7 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`)
    ];
  }
}

// Type definitions
interface GameAnalysis {
  playerHealth: number;
  opponentHealth: number;
  playerFate: number;
  opponentFate: number;
  playerHand: string[];
  opponentHand: string[];
  playerLanes: any[];
  opponentLanes: any[];
  arcanaTrials: { sun: number; moon: number; judgement: number };
  majorArcanaCharge: number;
  turn: number;
  reactionWindowOpen: boolean;
  spreadSlots: { past: any; present: any; future: any };
  cardOrientations: Record<string, string>;
  threatLevel: number;
  winConditionProgress: WinConditionProgress;
}

interface WinConditionProgress {
  healthVictory: number;
  trialsVictory: number;
  deckOutVictory: number;
}

/**
 * Create an AI opponent with specified configuration
 */
export function createTarotAI(config: Partial<TarotAIConfig> = {}, seed = 'ai-seed'): TarotAI {
  const fullConfig: TarotAIConfig = {
    difficulty: config.difficulty || 'medium',
    personality: config.personality || 'balanced',
    deck: config.deck
  };
  
  return new TarotAI(fullConfig, seed);
}

/**
 * Run a match against AI
 */
export async function playAgainstAI(
  playerDeck: string[],
  aiConfig: Partial<TarotAIConfig> = {},
  seed = 'match-seed'
): Promise<{ winner: string; turns: number; finalState: MatchState }> {
  const ai = createTarotAI(aiConfig, seed);
  
  let state = createInitialState({
    players: [
      { id: 'human', name: 'Human Player' },
      { id: 'ai', name: 'AI Opponent' }
    ],
    rngSeed: seed
  });
  
  let turns = 0;
  const maxTurns = 100;
  
  while (turns < maxTurns) {
    const currentPlayer = state.turn % 2 === 0 ? 'human' : 'ai';
    
    if (currentPlayer === 'ai') {
      const decision = ai.chooseAction(state, 'ai');
      
      // Convert AI decision to intent
      const intent = {
        type: decision.action,
        playerId: 'ai',
        cardId: decision.cardId,
        laneIndex: decision.laneIndex,
        targetId: decision.targetId
      };
      
      state = applyIntent(state, intent);
    } else {
      // Human turn would be handled by UI
      // For now, simulate with random play
      state = applyIntent(state, { type: 'end_turn', playerId: 'human' });
    }
    
    const winner = checkVictory(state);
    if (winner) {
      return { winner, turns, finalState: state };
    }
    
    turns++;
  }
  
  return { winner: 'draw', turns, finalState: state };
}