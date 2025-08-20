import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { Card, Deck, CardSchema, DeckSchema } from './schema';

// Database connection
let client: postgres.Sql | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

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
    if (!drizzleDb) {
        const client = getClient();
        drizzleDb = drizzle(client, { schema });
    }
    return drizzleDb;
}

// Check if database is available
function isDatabaseAvailable() {
    return !!process.env.DATABASE_URL;
}

// Typed database operations with Zod validation
export class Database {
    async getCards(): Promise<Card[]> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.select().from(schema.cards);
        return result.map(card => CardSchema.parse(card));
    }

    async getCardById(id: string): Promise<Card | null> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.select().from(schema.cards).where(eq(schema.cards.id, id)).limit(1);
        if (result.length === 0) return null;
        return CardSchema.parse(result[0]);
    }

    async createCard(card: Omit<Card, 'id'> & { id?: string }): Promise<Card> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const cardId = card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const cardData = { ...card, id: cardId };

        const result = await db.insert(schema.cards).values({
            id: cardData.id,
            name: cardData.name,
            suit: cardData.suit,
            cost: cardData.cost,
            type: cardData.type,
            rarity: cardData.rarity,
            cardSet: cardData.cardSet,
        }).returning();

        return CardSchema.parse(result[0]);
    }

    async getDecks(): Promise<Deck[]> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.select().from(schema.decks);
        return result.map(deck => DeckSchema.parse(deck));
    }

    async getDeckById(id: string): Promise<Deck | null> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.select().from(schema.decks).where(eq(schema.decks.id, id)).limit(1);
        if (result.length === 0) return null;
        return DeckSchema.parse(result[0]);
    }

    async createDeck(deck: Omit<Deck, 'id'> & { id?: string }): Promise<Deck> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const deckId = deck.id || `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const deckData = { ...deck, id: deckId };

        const result = await db.insert(schema.decks).values({
            id: deckData.id,
            ownerId: deckData.ownerId,
            format: deckData.format,
        }).returning();

        return DeckSchema.parse(result[0]);
    }

    async deleteCard(id: string): Promise<boolean> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.delete(schema.cards).where(eq(schema.cards.id, id));
        return result.length > 0;
    }

    async deleteDeck(id: string): Promise<boolean> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }
        const db = getDb();
        const result = await db.delete(schema.decks).where(eq(schema.decks.id, id));
        return result.length > 0;
    }

    // Seed function for initial data
    async seedDb(cardsData: Omit<Card, 'id'>[]): Promise<void> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }

        try {
            // Insert demo cards
            for (const card of cardsData) {
                await this.createCard(card).catch(() => {
                    // Ignore conflicts
                });
            }

            // Insert demo deck
            await this.createDeck({
                id: 'deck_123',
                ownerId: 'u_demo',
                format: 'standard',
            }).catch(() => {
                // Ignore conflicts
            });

            console.log('Database seeded successfully');
        } catch (error) {
            console.error('Failed to seed database:', error);
            throw error;
        }
    }

    async resetDb(): Promise<void> {
        if (!isDatabaseAvailable()) {
            throw new Error('Database not available - DATABASE_URL not set');
        }

        const db = getDb();

        try {
            // Clear existing data
            await db.delete(schema.cards);
            await db.delete(schema.decks);

            console.log('Database reset successfully');
        } catch (error) {
            console.error('Failed to reset database:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const database = new Database();

// Export schema and types
export * from './schema';
