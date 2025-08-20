import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { Card, Deck, CardSchema, DeckSchema } from './schema';

// Simple logging for database operations
const logDb = (action: string, data: any, success: boolean = true) => {
    const timestamp = new Date().toISOString();
    const level = success ? 'INFO' : 'ERROR';
    console.log(`[${timestamp}] [DB] [${level}] ${action}:`, data);
};

// Database connection
let client: postgres.Sql | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

// Initialize database connection
function getClient() {
    if (!client) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            logDb('CONNECTION_ERROR', { error: 'DATABASE_URL not set' }, false);
            throw new Error('DATABASE_URL environment variable is required');
        }

        logDb('CONNECTION_INIT', {
            hasConnectionString: !!connectionString,
            connectionStringPrefix: connectionString.substring(0, 20) + '...'
        });

        try {
            client = postgres(connectionString, {
                max: 10,
                idle_timeout: 20,
                connect_timeout: 10,
            });
            logDb('CONNECTION_SUCCESS', { message: 'Database client initialized' });
        } catch (error) {
            logDb('CONNECTION_ERROR', {
                error: error instanceof Error ? error.message : 'Unknown error'
            }, false);
            throw error;
        }
    }
    return client;
}

export function getDb() {
    if (!drizzleDb) {
        logDb('DRIZZLE_INIT', { message: 'Initializing Drizzle database instance' });
        const client = getClient();
        drizzleDb = drizzle(client, { schema });
        logDb('DRIZZLE_SUCCESS', { message: 'Drizzle database instance ready' });
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
        const startTime = Date.now();
        logDb('QUERY_START', { operation: 'getCards' });

        if (!isDatabaseAvailable()) {
            logDb('QUERY_ERROR', { operation: 'getCards', error: 'Database not available' }, false);
            throw new Error('Database not available - DATABASE_URL not set');
        }

        try {
            const db = getDb();
            const result = await db.select().from(schema.cards);
            const cards = result.map(card => CardSchema.parse(card));

            const duration = Date.now() - startTime;
            logDb('QUERY_SUCCESS', {
                operation: 'getCards',
                count: cards.length,
                duration
            });

            return cards;
        } catch (error) {
            const duration = Date.now() - startTime;
            logDb('QUERY_ERROR', {
                operation: 'getCards',
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            }, false);
            throw error;
        }
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
        const startTime = Date.now();
        const cardId = card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        logDb('INSERT_START', {
            operation: 'createCard',
            cardName: card.name,
            cardId,
            suit: card.suit,
            type: card.type
        });

        if (!isDatabaseAvailable()) {
            logDb('INSERT_ERROR', {
                operation: 'createCard',
                cardName: card.name,
                error: 'Database not available'
            }, false);
            throw new Error('Database not available - DATABASE_URL not set');
        }

        try {
            const db = getDb();
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

            const createdCard = CardSchema.parse(result[0]);
            const duration = Date.now() - startTime;

            logDb('INSERT_SUCCESS', {
                operation: 'createCard',
                cardId: createdCard.id,
                cardName: createdCard.name,
                duration
            });

            return createdCard;
        } catch (error) {
            const duration = Date.now() - startTime;
            logDb('INSERT_ERROR', {
                operation: 'createCard',
                cardName: card.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            }, false);
            throw error;
        }
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
        const startTime = Date.now();
        logDb('SEED_START', {
            cardCount: cardsData.length,
            suits: [...new Set(cardsData.map(c => c.suit))],
            types: [...new Set(cardsData.map(c => c.type))]
        });

        if (!isDatabaseAvailable()) {
            logDb('SEED_ERROR', { error: 'Database not available' }, false);
            throw new Error('Database not available - DATABASE_URL not set');
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            // Insert demo cards
            for (const card of cardsData) {
                try {
                    await this.createCard(card);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    // Ignore conflicts
                }
            }

            // Insert demo deck
            try {
                await this.createDeck({
                    id: 'deck_123',
                    ownerId: 'u_demo',
                    format: 'standard',
                });
                logDb('SEED_DECK_SUCCESS', { deckId: 'deck_123' });
            } catch (error) {
                logDb('SEED_DECK_CONFLICT', { deckId: 'deck_123', error: 'Deck already exists' });
            }

            const duration = Date.now() - startTime;
            logDb('SEED_SUCCESS', {
                totalCards: cardsData.length,
                successCount,
                errorCount,
                duration
            });

            console.log('Database seeded successfully');
        } catch (error) {
            const duration = Date.now() - startTime;
            logDb('SEED_ERROR', {
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            }, false);
            console.error('Failed to seed database:', error);
            throw error;
        }
    }

    async resetDb(): Promise<void> {
        const startTime = Date.now();
        logDb('RESET_START', { operation: 'resetDb' });

        if (!isDatabaseAvailable()) {
            logDb('RESET_ERROR', { error: 'Database not available' }, false);
            throw new Error('Database not available - DATABASE_URL not set');
        }

        const db = getDb();

        try {
            // Clear existing data
            logDb('RESET_DELETE_CARDS', { message: 'Deleting all cards' });
            await db.delete(schema.cards);

            logDb('RESET_DELETE_DECKS', { message: 'Deleting all decks' });
            await db.delete(schema.decks);

            const duration = Date.now() - startTime;
            logDb('RESET_SUCCESS', { duration });

            console.log('Database reset successfully');
        } catch (error) {
            const duration = Date.now() - startTime;
            logDb('RESET_ERROR', {
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            }, false);
            console.error('Failed to reset database:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const database = new Database();

// Export schema and types
export * from './schema';
