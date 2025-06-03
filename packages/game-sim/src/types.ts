export type CardSuit = 'wands' | 'cups' | 'swords' | 'pentacles' | 'major';
export type CardType = 'spell' | 'unit' | 'artifact';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CardEffect {
  effect: string; // e.g., "silence(target,1)"
}

export interface CardDefinition {
  id: string; // e.g., "swords_02"
  name: string;
  suit: CardSuit;
  cost: number;
  type: CardType;
  upright: CardEffect;
  reversed: CardEffect;
  tags: string[];
  rarity: Rarity;
  set: string; // e.g., "base"
}

export interface DeckDefinition {
  id: string;
  ownerId: string;
  cards: string[]; // card ids
  majors: string[]; // major arcana ids
  format: 'standard' | 'wild' | 'pve';
}

export interface MatchState {
  matchId: string;
  seed: string;
  players: string[];
  turn: number;
  fate: Record<string, number>; // playerId -> fate value
  resources?: Record<string, number>; // simple pool for costs
  stacks: Record<string, unknown>;
  battlefield: Record<string, unknown>;
  hands: Record<string, unknown>;
}
