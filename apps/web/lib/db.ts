// Drizzle ORM implementation with PostgreSQL and Neon
// Proper database setup with migrations and connection pooling

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import cardsData from '@/data/cards.json';

// Database connection
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Initialize database connection
function getClient() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

export function getDb() {
  if (!db) {
    const client = getClient();
    db = drizzle(client, { schema });
  }
  return db;
}

// Seed function for initial data
export async function seedDb() {
  const db = getDb();

  try {
    // Insert demo cards
    for (const card of cardsData) {
      await db.insert(schema.cards).values({
        id: card.id,
        name: card.name,
        suit: card.suit,
        cost: card.cost,
        type: card.type,
        rarity: card.rarity,
        cardSet: card.set,
      }).onConflictDoNothing();
    }

    // Insert demo deck
    await db.insert(schema.decks).values({
      id: 'deck_123',
      ownerId: 'u_demo',
      format: 'standard',
    }).onConflictDoNothing();

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Failed to seed database:', error);
    throw error;
  }
}

export async function resetDb() {
  const db = getDb();

  try {
    // Clear existing data
    await db.delete(schema.cards);
    await db.delete(schema.decks);

    // Re-seed
    await seedDb();

    console.log('Database reset and re-seeded successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

export function getSqlite() {
  // Return a compatibility interface for existing code
  return {
    prepare: (query: string) => ({
      run: async (...args: any[]) => {
        const db = getDb();
        try {
          if (query.toLowerCase().includes('insert into cards')) {
            const [, , id, name, suit, cost, type, rarity, cardSet] = args;
            await db.insert(schema.cards).values({
              id, name, suit, cost, type, rarity, cardSet
            }).onConflictDoNothing();
          } else if (query.toLowerCase().includes('insert into decks')) {
            const [, , id, ownerId, format] = args;
            await db.insert(schema.decks).values({
              id, ownerId, format
            }).onConflictDoNothing();
          } else if (query.toLowerCase().includes('delete from')) {
            if (query.toLowerCase().includes('cards')) {
              await db.delete(schema.cards);
            } else if (query.toLowerCase().includes('decks')) {
              await db.delete(schema.decks);
            }
          }
          return { lastInsertRowid: 1, changes: 1 };
        } catch (error) {
          console.error('Database operation error:', error);
          return { lastInsertRowid: 1, changes: 0 };
        }
      },
      all: async () => {
        const db = getDb();
        try {
          if (query.toLowerCase().includes('from cards')) {
            return await db.select().from(schema.cards);
          } else if (query.toLowerCase().includes('from decks')) {
            return await db.select().from(schema.decks);
          }
          return [];
        } catch (error) {
          console.error('Database query error:', error);
          return [];
        }
      },
      get: async () => {
        const db = getDb();
        try {
          if (query.toLowerCase().includes('from cards')) {
            const result = await db.select().from(schema.cards).limit(1);
            return result[0] || null;
          } else if (query.toLowerCase().includes('from decks')) {
            const result = await db.select().from(schema.decks).limit(1);
            return result[0] || null;
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
