import { pgTable, text, integer, timestamp, boolean, jsonb, decimal, index, uniqueIndex, pgSchema } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// ============================================
// NEON AUTH INTEGRATION
// ============================================

// Reference to Neon Auth's user table in neon_auth schema
// This table is managed by Neon Auth - we just reference it
const neonAuthSchema = pgSchema('neon_auth');

export const neonAuthUsers = neonAuthSchema.table('users_sync', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
  deleted_at: timestamp('deleted_at'),
  raw_json: jsonb('raw_json'), // Contains full user data from provider
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  suit: z.string(),
  cost: z.number(),
  attack: z.number().optional(),
  health: z.number().optional(),
  type: z.enum(['unit', 'spell', 'burst', 'fast', 'slow']),
  keywords: z.array(z.string()).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'champion']),
  cardSet: z.string(),
  championLevelUp: z.string().optional(),
});

export const DeckSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  format: z.string(),
});

export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;

// ============================================
// GAME CONTENT TABLES
// ============================================

// Master card list - all cards in the game
export const cards = pgTable('cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  suit: text('suit').notNull(),
  cost: integer('cost').notNull(),
  attack: integer('attack'),
  health: integer('health'),
  type: text('type').notNull(),
  keywords: jsonb('keywords').$type<string[]>(),
  rarity: text('rarity').notNull(),
  cardSet: text('card_set').notNull(),
  championLevelUp: text('champion_level_up'),
  imageUrl: text('image_url'),
  flavorText: text('flavor_text'),
  artist: text('artist'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  setIdx: index('cards_set_idx').on(table.cardSet),
  rarityIdx: index('cards_rarity_idx').on(table.rarity),
}));

// ============================================
// PLAYER PROGRESSION TABLES
// ============================================

// Player profiles with stats - Links to Neon Auth users
export const playerProfiles = pgTable('player_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References neon_auth.users_sync.id
  displayName: text('display_name').notNull(),
  level: integer('level').notNull().default(1),
  experience: integer('experience').notNull().default(0),
  currency: integer('currency').notNull().default(100),
  premiumCurrency: integer('premium_currency').notNull().default(0),
  
  // Stats
  totalGamesPlayed: integer('total_games_played').notNull().default(0),
  totalWins: integer('total_wins').notNull().default(0),
  totalLosses: integer('total_losses').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bestWinStreak: integer('best_win_streak').notNull().default(0),
  
  // Preferences
  selectedCardBack: text('selected_card_back'),
  selectedAvatar: text('selected_avatar'),
  selectedBoard: text('selected_board'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('player_profiles_user_idx').on(table.userId),
}));

// Player's card collection
export const playerCollections = pgTable('player_collections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References neon_auth.users_sync.id
  cardId: text('card_id').notNull().references(() => cards.id),
  quantity: integer('quantity').notNull().default(1),
  obtainedAt: timestamp('obtained_at').defaultNow().notNull(),
  obtainedFrom: text('obtained_from'),
}, (table) => ({
  userCardIdx: uniqueIndex('player_collections_user_card_idx').on(table.userId, table.cardId),
}));

// Player's decks
export const playerDecks = pgTable('player_decks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References neon_auth.users_sync.id
  name: text('name').notNull(),
  format: text('format').notNull(),
  cards: jsonb('cards').notNull().$type<{ cardId: string; quantity: number }[]>(),
  coverCard: text('cover_card'),
  isActive: boolean('is_active').notNull().default(true),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('player_decks_user_idx').on(table.userId),
  activeIdx: index('player_decks_active_idx').on(table.isActive),
}));

// ============================================
// PVE TABLES
// ============================================

export const pveRuns = pgTable('pve_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References neon_auth.users_sync.id
  seed: text('seed').notNull(),
  status: text('status').notNull(),
  
  currentNodeId: text('current_node_id'),
  completedNodes: jsonb('completed_nodes').$type<string[]>(),
  region: integer('region').notNull().default(1),
  floor: integer('floor').notNull().default(1),
  
  health: integer('health').notNull(),
  maxHealth: integer('max_health').notNull(),
  gold: integer('gold').notNull(),
  
  deck: jsonb('deck').notNull().$type<string[]>(),
  relics: jsonb('relics').$type<string[]>(),
  
  battlesWon: integer('battles_won').notNull().default(0),
  elitesDefeated: integer('elites_defeated').notNull().default(0),
  bossesDefeated: integer('bosses_defeated').notNull().default(0),
  cardsObtained: integer('cards_obtained').notNull().default(0),
  
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('pve_runs_user_idx').on(table.userId),
  statusIdx: index('pve_runs_status_idx').on(table.status),
}));

// ============================================
// PVP TABLES
// ============================================

export const pvpMatches = pgTable('pvp_matches', {
  id: text('id').primaryKey(),
  player1Id: text('player1_id').notNull(), // References neon_auth.users_sync.id
  player2Id: text('player2_id').notNull(), // References neon_auth.users_sync.id
  winnerId: text('winner_id'), // References neon_auth.users_sync.id
  loserId: text('loser_id'), // References neon_auth.users_sync.id
  
  format: text('format').notNull(),
  duration: integer('duration'),
  turnCount: integer('turn_count'),
  
  player1DeckId: text('player1_deck_id').references(() => playerDecks.id),
  player2DeckId: text('player2_deck_id').references(() => playerDecks.id),
  
  wagerEnabled: boolean('wager_enabled').notNull().default(false),
  wageredCardId: text('wagered_card_id').references(() => cards.id),
  wagerClaimedBy: text('wager_claimed_by'), // References neon_auth.users_sync.id
  
  player1RatingBefore: integer('player1_rating_before'),
  player1RatingAfter: integer('player1_rating_after'),
  player2RatingBefore: integer('player2_rating_before'),
  player2RatingAfter: integer('player2_rating_after'),
  
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
}, (table) => ({
  player1Idx: index('pvp_matches_player1_idx').on(table.player1Id),
  player2Idx: index('pvp_matches_player2_idx').on(table.player2Id),
  winnerIdx: index('pvp_matches_winner_idx').on(table.winnerId),
  formatIdx: index('pvp_matches_format_idx').on(table.format),
  startedAtIdx: index('pvp_matches_started_at_idx').on(table.startedAt),
}));

// ============================================
// LEADERBOARDS
// ============================================

export const pvpRankings = pgTable('pvp_rankings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References neon_auth.users_sync.id
  season: integer('season').notNull(),
  rating: integer('rating').notNull().default(1000),
  rank: integer('rank'),
  tier: text('tier'),
  
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bestRating: integer('best_rating').notNull().default(1000),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userSeasonIdx: uniqueIndex('pvp_rankings_user_season_idx').on(table.userId, table.season),
  ratingIdx: index('pvp_rankings_rating_idx').on(table.rating),
  seasonIdx: index('pvp_rankings_season_idx').on(table.season),
}));

// Add remaining tables following the same pattern...
// All userId fields reference neon_auth.users_sync.id instead of having FK constraints

// ============================================
// HELPER FUNCTIONS FOR QUERYING WITH JOINS
// ============================================

// Example of how to join with Neon Auth users:
// SELECT 
//   pp.*, 
//   u.name, 
//   u.email 
// FROM player_profiles pp
// JOIN neon_auth.users_sync u ON pp.user_id = u.id
// WHERE u.deleted_at IS NULL;