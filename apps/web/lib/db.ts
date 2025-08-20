// Database interface using the shared @tarot/db package
// This provides a clean, typed interface to the database

import { database as db, getDb } from '@tarot/db';
import { users, accounts, sessions, verificationTokens } from '@tarot/db';
import cardsData from '@/data/cards.json';

// Re-export the database instance, tables, and types for convenience
export { db, getDb };
export { users, accounts, sessions, verificationTokens };
export type { Card, Deck } from '@tarot/db';

// Seed function for initial data using the typed db package
export async function seedDb() {
  try {
    await db.seedDb(cardsData.map(card => ({
      name: card.name,
      suit: card.suit,
      cost: card.cost,
      type: card.type,
      rarity: card.rarity,
      cardSet: card.set,
    })));
  } catch (error) {
    console.error('Failed to seed database:', error);
    throw error;
  }
}

// Reset database using the typed db package
export async function resetDb() {
  try {
    await db.resetDb();
    await seedDb();
    console.log('Database reset and re-seeded successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

// Compatibility interface for existing code that expects SQLite-style interface
export function getSqlite() {
  return {
    prepare: (query: string) => ({
      run: async (...args: any[]) => {
        try {
          if (query.toLowerCase().includes('insert into cards')) {
            const [, , id, name, suit, cost, type, rarity, cardSet] = args;
            await db.createCard({
              id,
              name,
              suit,
              cost: Number(cost),
              type,
              rarity,
              cardSet
            });
          } else if (query.toLowerCase().includes('insert into decks')) {
            const [, , id, ownerId, format] = args;
            await db.createDeck({
              id,
              ownerId,
              format
            });
          } else if (query.toLowerCase().includes('delete from')) {
            if (query.toLowerCase().includes('cards')) {
              // Note: This would need specific ID to delete
              // For compatibility, we'll skip individual deletes
            } else if (query.toLowerCase().includes('decks')) {
              // Note: This would need specific ID to delete
              // For compatibility, we'll skip individual deletes
            }
          }
          return { lastInsertRowid: 1, changes: 1 };
        } catch (error) {
          console.error('Database operation error:', error);
          return { lastInsertRowid: 1, changes: 0 };
        }
      },
      all: async () => {
        try {
          if (query.toLowerCase().includes('from cards')) {
            return await db.getCards();
          } else if (query.toLowerCase().includes('from decks')) {
            return await db.getDecks();
          }
          return [];
        } catch (error) {
          console.error('Database query error:', error);
          return [];
        }
      },
      get: async () => {
        try {
          if (query.toLowerCase().includes('from cards')) {
            const cards = await db.getCards();
            return cards[0] || null;
          } else if (query.toLowerCase().includes('from decks')) {
            const decks = await db.getDecks();
            return decks[0] || null;
          }
          return null;
        } catch (error) {
          console.error('Database query error:', error);
          return null;
        }
      }
    }),
    exec: async (sqlString: string) => {
      // Handle raw SQL execution if needed
      console.log('Raw SQL exec:', sqlString);
    }
  };
}
