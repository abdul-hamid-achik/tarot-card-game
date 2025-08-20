import { pgTable, text, integer, serial } from 'drizzle-orm/pg-core';

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
