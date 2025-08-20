import { pgTable, text, integer, serial } from 'drizzle-orm/pg-core';
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

// Database tables
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
