export type CardSuit = 'wands' | 'cups' | 'swords' | 'pentacles' | 'major';
export type CardType = 'unit' | 'spell' | 'burst' | 'fast' | 'slow';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'champion';

export type TurnPhase = 'draw' | 'main' | 'combat' | 'end';
export type CardOrientation = 'upright' | 'reversed';
export type GameSpeed = 'burst' | 'fast' | 'slow';

// Keywords for LoR-style abilities
export type Keyword = 
  | 'quick-attack'
  | 'challenger'
  | 'elusive'
  | 'overwhelm'
  | 'lifesteal'
  | 'barrier'
  | 'tough'
  | 'fearsome'
  | 'regeneration'
  | 'fury'
  | 'spellshield';

export interface CardEffect {
  effect: string; // e.g., "silence(target,1)"
}

export interface CardDefinition {
  id: string; // e.g., "swords_02"
  name: string;
  suit: CardSuit;
  cost: number;
  type: CardType;
  attack?: number; // For units
  health?: number; // For units
  keywords?: Keyword[]; // LoR-style keywords
  upright: CardEffect;
  reversed: CardEffect;
  tags: string[];
  rarity: Rarity;
  set: string; // e.g., "base"
  championLevelUp?: string; // Condition for champion level up
}

export interface DeckDefinition {
  id: string;
  ownerId: string;
  cards: string[]; // card ids
  majors: string[]; // major arcana ids
  format: 'standard' | 'wild' | 'pve';
}

// Unit on the battlefield
export interface Unit {
  id: string;
  cardId: string; // Reference to CardDefinition
  owner: string;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  position?: number; // Position in bench/battlefield array (0-5)
  canAttack: boolean;
  hasAttacked: boolean;
  keywords: Keyword[];
  buffs: Array<{ type: string; value: number; duration?: number }>;
  damage: number; // Damage taken this turn
  isAttacking?: boolean;
  isBlocking?: boolean;
  blockedUnitId?: string; // ID of unit this is blocking
  zone?: 'bench' | 'battlefield'; // Current zone
}

// Player state in LoR-style game
export interface PlayerState {
  id: string;
  nexusHealth: number;
  mana: number;
  maxMana: number;
  spellMana: number; // Banked mana for spells (max 3)
  hand: string[]; // Card IDs
  deck: string[]; // Card IDs
  discard: string[]; // Card IDs
  bench: Array<Unit | null>; // Back row - units placed but not in combat (6 slots)
  battlefield: Array<Unit | null>; // Combat row - attacking/blocking units (6 slots)
  hasAttackToken: boolean;
  passed: boolean;
  
  // Legacy support - will be removed
  board?: Array<Unit | null>; // Deprecated - use bench/battlefield
}

// Combat pairing for attack/block
export interface CombatPair {
  attackerId: string;
  blockerId?: string; // Optional, can attack nexus directly
}

export interface MatchState {
  matchId: string;
  seed: string;
  players: string[];
  turn: number;
  currentPlayer: string;
  phase: TurnPhase;
  
  // Player states
  playerStates: Record<string, PlayerState>;
  
  // Combat state
  attackToken: string; // Who has attack token this round
  combatPairs?: CombatPair[]; // Active combat pairings
  
  // Spell stack (for fast/slow spells)
  spellStack: Array<{
    id: string;
    cardId: string;
    owner: string;
    targets?: string[];
  }>;
  
  // Priority and reaction windows
  priority?: string; // Who has priority to act
  reactionWindow?: {
    open: boolean;
    respondingPlayer: string;
    source: string; // What triggered the reaction window
  };
  
  // Card library reference
  cardLibrary: Record<string, CardDefinition>;
  
  // History for replay/undo
  actionHistory: Array<{
    playerId: string;
    action: string;
    timestamp: number;
    state?: Partial<MatchState>; // Snapshot for rollback
  }>;
}
