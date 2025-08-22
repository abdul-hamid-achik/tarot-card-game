// Database interface using the shared @tarot/db package
// This provides a clean, typed interface to the database

import { database as db, getDb } from '@tarot/db';
import { neonAuthUsers } from '@tarot/db';
import cardsData from '@/data/cards.json';
import { gameLogger } from '@tarot/game-logger';

// Re-export the database instance, tables, and types for convenience
export { db, getDb };
export { neonAuthUsers };
export type { Card, Deck } from '@tarot/db';

// Seed function for initial data using the typed db package
export async function seedDb() {
  gameLogger.logAction('db_seed_start', {
    cardCount: cardsData.length,
    suits: [...new Set(cardsData.map(c => c.suit))],
    types: [...new Set(cardsData.map(c => c.type))]
  }, true, 'Starting database seeding');

  try {
    const startTime = Date.now();
    await db.seedDb(cardsData.map(card => ({
      name: card.name,
      suit: card.suit,
      cost: card.cost,
      type: card.type,
      rarity: card.rarity,
      cardSet: card.set,
    })));
    const duration = Date.now() - startTime;

    gameLogger.logAction('db_seed_success', {
      cardCount: cardsData.length,
      duration,
      operations: 'insert'
    }, true, 'Database seeded successfully');
  } catch (error) {
    gameLogger.logAction('db_seed_error', {
      cardCount: cardsData.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Database seeding failed');

    console.error('Failed to seed database:', error);
    throw error;
  }
}

// Reset database using the typed db package
export async function resetDb() {
  gameLogger.logAction('db_reset_start', {
    operation: 'full_reset_and_seed'
  }, true, 'Starting database reset');

  try {
    const startTime = Date.now();

    await db.resetDb();
    await seedDb();

    const duration = Date.now() - startTime;

    gameLogger.logAction('db_reset_success', {
      duration,
      operations: 'reset_and_seed'
    }, true, 'Database reset and re-seeded successfully');

    console.log('Database reset and re-seeded successfully');
  } catch (error) {
    gameLogger.logAction('db_reset_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false, 'Database reset failed');

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
            gameLogger.logAction('db_insert_card', {
              id,
              name,
              suit,
              type,
              rarity
            }, true, 'Card inserted via compatibility interface');
          } else if (query.toLowerCase().includes('insert into decks')) {
            const [, , id, ownerId, format] = args;
            await db.createDeck({
              id,
              ownerId,
              format
            });
            gameLogger.logAction('db_insert_deck', {
              id,
              ownerId,
              format
            }, true, 'Deck inserted via compatibility interface');
          } else if (query.toLowerCase().includes('delete from')) {
            if (query.toLowerCase().includes('cards')) {
              // Note: This would need specific ID to delete
              // For compatibility, we'll skip individual deletes
              gameLogger.logAction('db_delete_skipped', {
                table: 'cards',
                reason: 'no_specific_id_provided'
              }, false, 'Card deletion skipped - no specific ID provided');
            } else if (query.toLowerCase().includes('decks')) {
              // Note: This would need specific ID to delete
              // For compatibility, we'll skip individual deletes
              gameLogger.logAction('db_delete_skipped', {
                table: 'decks',
                reason: 'no_specific_id_provided'
              }, false, 'Deck deletion skipped - no specific ID provided');
            }
          }
          return { lastInsertRowid: 1, changes: 1 };
        } catch (error) {
          gameLogger.logAction('db_operation_error', {
            query: query.substring(0, 50),
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false, 'Database operation failed');

          console.error('Database operation error:', error);
          return { lastInsertRowid: 1, changes: 0 };
        }
      },
      all: async () => {
        try {
          if (query.toLowerCase().includes('from cards')) {
            const cards = await db.getCards();
            gameLogger.logAction('db_query_cards', {
              count: cards.length,
              query: 'get_all_cards'
            }, true, 'Retrieved all cards from database');
            return cards;
          } else if (query.toLowerCase().includes('from decks')) {
            const decks = await db.getDecks();
            gameLogger.logAction('db_query_decks', {
              count: decks.length,
              query: 'get_all_decks'
            }, true, 'Retrieved all decks from database');
            return decks;
          }
          gameLogger.logAction('db_query_unknown', {
            query: query.substring(0, 50)
          }, false, 'Unknown query type in compatibility interface');
          return [];
        } catch (error) {
          gameLogger.logAction('db_query_error', {
            query: query.substring(0, 50),
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false, 'Database query failed');
          console.error('Database query error:', error);
          return [];
        }
      },
      get: async () => {
        try {
          if (query.toLowerCase().includes('from cards')) {
            const cards = await db.getCards();
            const result = cards[0] || null;
            gameLogger.logAction('db_get_first_card', {
              found: result !== null,
              totalCards: cards.length,
              cardName: result?.name
            }, result !== null, 'Retrieved first card from database');
            return result;
          } else if (query.toLowerCase().includes('from decks')) {
            const decks = await db.getDecks();
            const result = decks[0] || null;
            gameLogger.logAction('db_get_first_deck', {
              found: result !== null,
              totalDecks: decks.length,
              deckId: result?.id
            }, result !== null, 'Retrieved first deck from database');
            return result;
          }
          gameLogger.logAction('db_get_unknown', {
            query: query.substring(0, 50)
          }, false, 'Unknown get query type in compatibility interface');
          return null;
        } catch (error) {
          gameLogger.logAction('db_get_error', {
            query: query.substring(0, 50),
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false, 'Database get query failed');
          console.error('Database query error:', error);
          return null;
        }
      }
    }),
    exec: async (sqlString: string) => {
      // Handle raw SQL execution if needed
      gameLogger.logAction('db_exec_sql', {
        sql: sqlString.substring(0, 100),
        length: sqlString.length
      }, true, 'Raw SQL execution via compatibility interface');

      console.log('Raw SQL exec:', sqlString);
    }
  };
}
