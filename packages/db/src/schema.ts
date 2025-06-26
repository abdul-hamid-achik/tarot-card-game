import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  suit: text('suit').notNull(),
  cost: integer('cost').notNull(),
  type: text('type').notNull(),
  rarity: text('rarity').notNull(),
  set: text('set').notNull(),
});

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  format: text('format').notNull(),
});
