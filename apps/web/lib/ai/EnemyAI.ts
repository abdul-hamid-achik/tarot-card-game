import { Card, CardSuit, GamePhase, BoardSlot } from '@/lib/store/gameStore';
import { gameLogger } from '@tarot/game-logger';

export type AIPersonality = 'aggressive' | 'defensive' | 'balanced' | 'chaotic' | 'strategic';
export type AIDifficulty = 'novice' | 'apprentice' | 'adept' | 'master' | 'legendary';

export interface AIConfig {
  personality: AIPersonality;
  difficulty: AIDifficulty;

  // Decision weights (0-1)
  aggressionLevel: number;      // Preference for attacking
  defenseLevel: number;          // Preference for defense
  fateUsage: number;            // How often to use fate
  cardPlayRate: number;         // How many cards to play per turn
  reactionSpeed: number;        // Time to make decisions (ms)
  mistakeChance: number;        // Chance to make suboptimal plays

  // Strategic preferences
  preferredSuits?: CardSuit[];
  trialFocus: boolean;          // Focus on completing trials
  boardControl: boolean;        // Prioritize board presence
  handManagement: boolean;      // Save cards for combos
}

export interface Enemy {
  id: string;
  name: string;
  title: string;
  portrait: string;  // Path to character profile image
  deckTheme: string;
  personality: AIPersonality;
  difficulty: AIDifficulty;
  config: AIConfig;
  tauntLines: string[];
  defeatLine: string;
  victoryLine: string;
}

// Difficulty presets
const difficultyPresets: Record<AIDifficulty, Partial<AIConfig>> = {
  novice: {
    cardPlayRate: 0.3,
    mistakeChance: 0.4,
    reactionSpeed: 2000,
    fateUsage: 0.2,
  },
  apprentice: {
    cardPlayRate: 0.5,
    mistakeChance: 0.25,
    reactionSpeed: 1500,
    fateUsage: 0.4,
  },
  adept: {
    cardPlayRate: 0.7,
    mistakeChance: 0.15,
    reactionSpeed: 1000,
    fateUsage: 0.6,
  },
  master: {
    cardPlayRate: 0.85,
    mistakeChance: 0.05,
    reactionSpeed: 500,
    fateUsage: 0.8,
  },
  legendary: {
    cardPlayRate: 0.95,
    mistakeChance: 0,
    reactionSpeed: 200,
    fateUsage: 0.95,
  }
};

// Enemy templates based on your character profiles
export const enemyTemplates: Enemy[] = [
  // Region 1 - Novice Enemies
  {
    id: 'apprentice_seer',
    name: 'Luna',
    title: 'Apprentice Seer',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_profile.png',
    deckTheme: 'cups',
    personality: 'defensive',
    difficulty: 'novice',
    config: {
      personality: 'defensive',
      difficulty: 'novice',
      aggressionLevel: 0.2,
      defenseLevel: 0.8,
      fateUsage: 0.3,
      cardPlayRate: 0.4,
      reactionSpeed: 2000,
      mistakeChance: 0.35,
      preferredSuits: ['cups'],
      trialFocus: false,
      boardControl: false,
      handManagement: false,
    },
    tauntLines: [
      "The cards whisper of your defeat...",
      "I see your future, and it's not bright.",
      "The spirits are not on your side today."
    ],
    defeatLine: "The visions... they betrayed me!",
    victoryLine: "As the cards foretold."
  },
  {
    id: 'rogue_initiate',
    name: 'Crow',
    title: 'Rogue Initiate',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_profile_2.png',
    deckTheme: 'swords',
    personality: 'aggressive',
    difficulty: 'novice',
    config: {
      personality: 'aggressive',
      difficulty: 'novice',
      aggressionLevel: 0.8,
      defenseLevel: 0.2,
      fateUsage: 0.2,
      cardPlayRate: 0.5,
      reactionSpeed: 1500,
      mistakeChance: 0.3,
      preferredSuits: ['swords'],
      trialFocus: false,
      boardControl: true,
      handManagement: false,
    },
    tauntLines: [
      "Quick and deadly, that's my way!",
      "You're too slow!",
      "Strike first, strike hard!"
    ],
    defeatLine: "I wasn't... fast enough...",
    victoryLine: "Speed beats strength every time."
  },

  // Region 2 - Apprentice/Adept Enemies
  {
    id: 'mystic_scholar',
    name: 'Sage Eldrin',
    title: 'Mystic Scholar',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_profile_3.png',
    deckTheme: 'major',
    personality: 'strategic',
    difficulty: 'adept',
    config: {
      personality: 'strategic',
      difficulty: 'adept',
      aggressionLevel: 0.5,
      defenseLevel: 0.5,
      fateUsage: 0.7,
      cardPlayRate: 0.6,
      reactionSpeed: 1000,
      mistakeChance: 0.1,
      preferredSuits: ['major', 'pentacles'],
      trialFocus: true,
      boardControl: true,
      handManagement: true,
    },
    tauntLines: [
      "I have studied the arcane arts for decades.",
      "Your moves are predictable.",
      "Knowledge is the ultimate power."
    ],
    defeatLine: "Impossible! My calculations were perfect!",
    victoryLine: "As expected. Study brings mastery."
  },
  {
    id: 'flame_dancer',
    name: 'Embara',
    title: 'Flame Dancer',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_profile_4.png',
    deckTheme: 'wands',
    personality: 'chaotic',
    difficulty: 'apprentice',
    config: {
      personality: 'chaotic',
      difficulty: 'apprentice',
      aggressionLevel: 0.7,
      defenseLevel: 0.3,
      fateUsage: 0.5,
      cardPlayRate: 0.8,
      reactionSpeed: 800,
      mistakeChance: 0.2,
      preferredSuits: ['wands'],
      trialFocus: false,
      boardControl: true,
      handManagement: false,
    },
    tauntLines: [
      "Feel the heat of my passion!",
      "Dance with the flames!",
      "Burn bright, burn fast!"
    ],
    defeatLine: "The flames... extinguished...",
    victoryLine: "You got burned!"
  },

  // Region 3 - Master/Legendary Bosses
  {
    id: 'arcanum_master',
    name: 'Magistrate Void',
    title: 'Master of the Arcanum',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_character_profiles.png',
    deckTheme: 'mixed',
    personality: 'balanced',
    difficulty: 'master',
    config: {
      personality: 'balanced',
      difficulty: 'master',
      aggressionLevel: 0.7,
      defenseLevel: 0.7,
      fateUsage: 0.9,
      cardPlayRate: 0.85,
      reactionSpeed: 300,
      mistakeChance: 0.02,
      preferredSuits: ['major', 'swords', 'pentacles'],
      trialFocus: true,
      boardControl: true,
      handManagement: true,
    },
    tauntLines: [
      "I am the master of all four suits.",
      "Your defeat was written in the stars.",
      "The Arcanum bends to my will."
    ],
    defeatLine: "This... cannot be... I am the master!",
    victoryLine: "The Arcanum has spoken."
  },
  {
    id: 'chaos_incarnate',
    name: 'The Fool King',
    title: 'Avatar of Chaos',
    portrait: '/api/ui/themes/pixel-pack/others/card_ui_character_profiles.png',
    deckTheme: 'chaotic',
    personality: 'chaotic',
    difficulty: 'legendary',
    config: {
      personality: 'chaotic',
      difficulty: 'legendary',
      aggressionLevel: Math.random(),  // Randomized each game
      defenseLevel: Math.random(),
      fateUsage: 1.0,
      cardPlayRate: 0.95,
      reactionSpeed: 100,
      mistakeChance: 0,  // Chaos is intentional
      trialFocus: Math.random() > 0.5,
      boardControl: Math.random() > 0.5,
      handManagement: Math.random() > 0.5,
    },
    tauntLines: [
      "Chaos! Beautiful chaos!",
      "Let the dice fall where they may!",
      "Order is an illusion!",
      "Madness is the only truth!"
    ],
    defeatLine: "Even chaos... must end...",
    victoryLine: "CHAOS REIGNS SUPREME!"
  }
];

export class EnemyAI {
  private enemy: Enemy;
  private config: AIConfig;
  private lastPlayTime: number = 0;

  constructor(enemy: Enemy) {
    this.enemy = enemy;
    this.config = { ...enemy.config };

    // Apply difficulty modifiers
    const difficultyMods = difficultyPresets[enemy.difficulty];
    this.config = { ...this.config, ...difficultyMods };

    gameLogger.logAction('ai_initialized', {
      enemyId: enemy.id,
      name: enemy.name,
      personality: enemy.personality,
      difficulty: enemy.difficulty,
      config: this.config
    }, true, 'AI opponent initialized');
  }

  // Evaluate board state and return a score
  private evaluateBoardState(
    myBoard: BoardSlot[],
    enemyBoard: BoardSlot[],
    myHealth: number,
    enemyHealth: number
  ): number {
    let score = 0;

    // Health advantage
    score += (myHealth - enemyHealth) * 2;

    // Board presence
    const myUnits = myBoard.filter(slot => slot && slot.card).length;
    const enemyUnits = enemyBoard.filter(slot => slot && slot.card).length;
    score += (myUnits - enemyUnits) * 5;

    // Total stats on board
    const myStats = myBoard.reduce((sum, slot) => {
      if (slot && slot.card?.type === 'unit') {
        return sum + (slot.card.attack || 0) + (slot.card.health || 0);
      }
      return sum;
    }, 0);

    const enemyStats = enemyBoard.reduce((sum, slot) => {
      if (slot && slot.card?.type === 'unit') {
        return sum + (slot.card.attack || 0) + (slot.card.health || 0);
      }
      return sum;
    }, 0);

    score += (myStats - enemyStats);

    return score;
  }

  // Decide which card to play
  async decideCardToPlay(
    hand: Card[],
    availableFate: number,
    board: BoardSlot[],
    enemyBoard: BoardSlot[],
    phase: GamePhase
  ): Promise<{ card: Card; targetSlot?: number } | null> {
    gameLogger.logAction('ai_decide_card_start', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      handSize: hand.length,
      availableFate,
      phase,
      personality: this.config.personality
    }, true, 'AI starting card decision process');

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, this.config.reactionSpeed));

    // Check if we should play a card based on play rate
    if (Math.random() > this.config.cardPlayRate) {
      gameLogger.logAction('ai_skip_play', {
        enemyId: this.enemy.id,
        reason: 'play_rate_check_failed',
        cardPlayRate: this.config.cardPlayRate
      }, true, 'AI chose not to play a card');
      return null;
    }

    // Filter playable cards
    const playableCards = hand.filter(card => card.cost <= availableFate);
    if (playableCards.length === 0) return null;

    // Apply mistake chance
    if (Math.random() < this.config.mistakeChance) {
      // Make a random play
      const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
      const emptySlots = board.map((slot, i) => !slot || (!slot.card && slot !== null) ? i : -1).filter(i => i >= 0);
      const targetSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

      gameLogger.logAction('ai_mistake_play', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        mistakeChance: this.config.mistakeChance,
        selectedCard: randomCard.name,
        targetSlot,
        availableCards: playableCards.length
      }, false, 'AI made suboptimal play due to mistake chance');

      return { card: randomCard, targetSlot };
    }

    // Strategic card selection based on personality
    let selectedCard: Card | null = null;
    let bestScore = -Infinity;

    for (const card of playableCards) {
      let score = 0;

      // Personality-based scoring
      switch (this.config.personality) {
        case 'aggressive':
          score += (card.attack || 0) * 3;
          score -= (card.health || 0) * 0.5;
          if (card.type === 'spell' && card.description?.includes('damage')) score += 10;
          break;

        case 'defensive':
          score += (card.health || 0) * 3;
          score += (card.attack || 0) * 0.5;
          if (card.description?.includes('heal') || card.description?.includes('taunt')) score += 10;
          break;

        case 'strategic':
          // Prefer cards that match trials or have synergy
          if (this.config.trialFocus && card.suit === 'major') score += 15;
          if (card.type === 'spell') score += 5;
          score += (card.cost / availableFate) * 5; // Efficient fate usage
          break;

        case 'chaotic':
          // Random preferences that change
          score = Math.random() * 20;
          break;

        case 'balanced':
          score += (card.attack || 0) * 2;
          score += (card.health || 0) * 2;
          score += card.cost; // Value higher cost cards
          break;
      }

      // Suit preferences
      if (this.config.preferredSuits?.includes(card.suit)) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        selectedCard = card;
      }
    }

    if (!selectedCard) {
      gameLogger.logAction('ai_no_card_selected', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        playableCards: playableCards.length,
        reason: 'no_card_met_criteria'
      }, false, 'AI could not find suitable card to play');
      return null;
    }

    // Find best slot for placement
    const emptySlots = board.map((slot, i) => !slot || slot === null ? i : !slot.card ? i : -1).filter(i => i >= 0);
    if (emptySlots.length === 0) {
      gameLogger.logAction('ai_no_slot_available', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        selectedCard: selectedCard.name,
        reason: 'board_full'
      }, false, 'AI could not find slot for card placement');
      return null;
    }

    // Strategic placement
    let targetSlot = emptySlots[0];
    if (this.config.boardControl) {
      // Place units to protect or threaten specific lanes
      targetSlot = emptySlots[Math.floor(emptySlots.length / 2)]; // Center placement
    } else {
      targetSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    }

    gameLogger.logAction('ai_card_selected', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      selectedCard: selectedCard.name,
      cardSuit: selectedCard.suit,
      cardType: selectedCard.type,
      targetSlot,
      emptySlots: emptySlots.length,
      personality: this.config.personality,
      strategicPlacement: this.config.boardControl
    }, true, 'AI successfully selected and placed a card');

    return { card: selectedCard, targetSlot };
  }

  // Decide whether to use fate
  shouldUseFate(currentFate: number, maxFate: number): boolean {
    if (currentFate === 0) {
      gameLogger.logAction('ai_fate_check', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        currentFate,
        maxFate,
        result: false,
        reason: 'no_fate_available'
      }, true, 'AI cannot use fate - none available');
      return false;
    }

    // Check fate usage preference
    if (Math.random() > this.config.fateUsage) {
      gameLogger.logAction('ai_fate_check', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        currentFate,
        maxFate,
        fateUsage: this.config.fateUsage,
        result: false,
        reason: 'usage_preference'
      }, true, 'AI chose not to use fate based on usage preference');
      return false;
    }

    // More likely to use fate when full
    const fateRatio = currentFate / maxFate;
    const willUse = Math.random() < fateRatio;

    gameLogger.logAction('ai_fate_check', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      currentFate,
      maxFate,
      fateRatio,
      fateUsage: this.config.fateUsage,
      result: willUse,
      reason: willUse ? 'ratio_check_passed' : 'ratio_check_failed'
    }, willUse, `AI ${willUse ? 'will' : 'will not'} use fate`);

    return willUse;
  }

  // Get a taunt line
  getTauntLine(): string {
    const tauntLine = this.enemy.tauntLines[Math.floor(Math.random() * this.enemy.tauntLines.length)];

    gameLogger.logAction('ai_taunt', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      tauntLine,
      personality: this.config.personality,
      availableTaunts: this.enemy.tauntLines.length
    }, true, 'AI generated taunt line');

    return tauntLine;
  }

  // React to player actions
  async reactToPlayerAction(
    action: string,
    gameState: any
  ): Promise<any> {
    gameLogger.logAction('ai_react_start', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      action,
      personality: this.config.personality,
      difficulty: this.config.difficulty
    }, true, 'AI reacting to player action');

    // Quick reactions for higher difficulty
    await new Promise(resolve => setTimeout(resolve, this.config.reactionSpeed / 2));

    // Analyze if we should respond
    if (action === 'play_card' && this.config.personality === 'defensive') {
      // Consider counter-play
      gameLogger.logAction('ai_counter_play', {
        enemyId: this.enemy.id,
        enemyName: this.enemy.name,
        triggerAction: action,
        personality: this.config.personality,
        reason: 'defensive_personality'
      }, true, 'AI considering counter-play due to defensive personality');

      return { type: 'consider_counter' };
    }

    gameLogger.logAction('ai_no_reaction', {
      enemyId: this.enemy.id,
      enemyName: this.enemy.name,
      action,
      personality: this.config.personality,
      reason: 'no_matching_conditions'
    }, true, 'AI chose not to react to player action');

    return null;
  }
}