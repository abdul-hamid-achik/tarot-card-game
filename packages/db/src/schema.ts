import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Zod schemas for validation
export const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  suit: z.string(),
  cost: z.number(),
  type: z.string(),
  rarity: z.string(),
  cardSet: z.string(),
});

export const DeckSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  format: z.string(),
});

export type Card = z.infer<typeof CardSchema>;
export type Deck = z.infer<typeof DeckSchema>;

// Auth.js database tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Game database tables
export const cards = pgTable('cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  suit: text('suit').notNull(),
  cost: integer('cost').notNull(),
  type: text('type').notNull(),
  rarity: text('rarity').notNull(),
  cardSet: text('card_set').notNull(),
});

export const decks = pgTable('decks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  format: text('format').notNull(),
});
