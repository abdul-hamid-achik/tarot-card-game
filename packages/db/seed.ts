import { seed } from 'drizzle-seed';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/schema';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// Tarot card data for seeding
const tarotCards = [
    // Major Arcana
    { id: 'major_00', name: 'The Fool', suit: 'major', cost: 0, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_01', name: 'The Magician', suit: 'major', cost: 1, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_02', name: 'The High Priestess', suit: 'major', cost: 2, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_03', name: 'The Empress', suit: 'major', cost: 3, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_04', name: 'The Emperor', suit: 'major', cost: 4, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_05', name: 'The Hierophant', suit: 'major', cost: 5, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_06', name: 'The Lovers', suit: 'major', cost: 6, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_07', name: 'The Chariot', suit: 'major', cost: 7, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_08', name: 'Strength', suit: 'major', cost: 8, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_09', name: 'The Hermit', suit: 'major', cost: 9, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_10', name: 'Wheel of Fortune', suit: 'major', cost: 10, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_11', name: 'Justice', suit: 'major', cost: 11, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_12', name: 'The Hanged Man', suit: 'major', cost: 12, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_13', name: 'Death', suit: 'major', cost: 13, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_14', name: 'Temperance', suit: 'major', cost: 14, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_15', name: 'The Devil', suit: 'major', cost: 15, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_16', name: 'The Tower', suit: 'major', cost: 16, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_17', name: 'The Star', suit: 'major', cost: 17, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_18', name: 'The Moon', suit: 'major', cost: 18, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_19', name: 'The Sun', suit: 'major', cost: 19, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_20', name: 'Judgement', suit: 'major', cost: 20, type: 'major', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_21', name: 'The World', suit: 'major', cost: 21, type: 'major', rarity: 'legendary', cardSet: 'major' },

    // Minor Arcana - Wands
    { id: 'wands_01', name: 'Ace of Wands', suit: 'wands', cost: 1, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_02', name: 'Two of Wands', suit: 'wands', cost: 2, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_03', name: 'Three of Wands', suit: 'wands', cost: 3, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'wands_04', name: 'Four of Wands', suit: 'wands', cost: 4, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_05', name: 'Five of Wands', suit: 'wands', cost: 5, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_06', name: 'Six of Wands', suit: 'wands', cost: 6, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'wands_07', name: 'Seven of Wands', suit: 'wands', cost: 7, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_08', name: 'Eight of Wands', suit: 'wands', cost: 8, type: 'spell', rarity: 'rare', cardSet: 'minor' },
    { id: 'wands_09', name: 'Nine of Wands', suit: 'wands', cost: 9, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_10', name: 'Ten of Wands', suit: 'wands', cost: 10, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_king', name: 'King of Wands', suit: 'wands', cost: 11, type: 'minion', rarity: 'rare', cardSet: 'minor' },
    { id: 'wands_queen', name: 'Queen of Wands', suit: 'wands', cost: 10, type: 'minion', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'wands_knight', name: 'Knight of Wands', suit: 'wands', cost: 9, type: 'minion', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_page', name: 'Page of Wands', suit: 'wands', cost: 8, type: 'minion', rarity: 'common', cardSet: 'minor' },

    // Minor Arcana - Cups
    { id: 'cups_01', name: 'Ace of Cups', suit: 'cups', cost: 1, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_02', name: 'Two of Cups', suit: 'cups', cost: 2, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_03', name: 'Three of Cups', suit: 'cups', cost: 3, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'cups_04', name: 'Four of Cups', suit: 'cups', cost: 4, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_05', name: 'Five of Cups', suit: 'cups', cost: 5, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_06', name: 'Six of Cups', suit: 'cups', cost: 6, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'cups_07', name: 'Seven of Cups', suit: 'cups', cost: 7, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_08', name: 'Eight of Cups', suit: 'cups', cost: 8, type: 'spell', rarity: 'rare', cardSet: 'minor' },
    { id: 'cups_09', name: 'Nine of Cups', suit: 'cups', cost: 9, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_10', name: 'Ten of Cups', suit: 'cups', cost: 10, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_king', name: 'King of Cups', suit: 'cups', cost: 11, type: 'minion', rarity: 'rare', cardSet: 'minor' },
    { id: 'cups_queen', name: 'Queen of Cups', suit: 'cups', cost: 10, type: 'minion', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'cups_knight', name: 'Knight of Cups', suit: 'cups', cost: 9, type: 'minion', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_page', name: 'Page of Cups', suit: 'cups', cost: 8, type: 'minion', rarity: 'common', cardSet: 'minor' },

    // Minor Arcana - Swords
    { id: 'swords_01', name: 'Ace of Swords', suit: 'swords', cost: 1, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_02', name: 'Two of Swords', suit: 'swords', cost: 2, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_03', name: 'Three of Swords', suit: 'swords', cost: 3, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'swords_04', name: 'Four of Swords', suit: 'swords', cost: 4, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_05', name: 'Five of Swords', suit: 'swords', cost: 5, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_06', name: 'Six of Swords', suit: 'swords', cost: 6, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'swords_07', name: 'Seven of Swords', suit: 'swords', cost: 7, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_08', name: 'Eight of Swords', suit: 'swords', cost: 8, type: 'spell', rarity: 'rare', cardSet: 'minor' },
    { id: 'swords_09', name: 'Nine of Swords', suit: 'swords', cost: 9, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_10', name: 'Ten of Swords', suit: 'swords', cost: 10, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_king', name: 'King of Swords', suit: 'swords', cost: 11, type: 'minion', rarity: 'rare', cardSet: 'minor' },
    { id: 'swords_queen', name: 'Queen of Swords', suit: 'swords', cost: 10, type: 'minion', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'swords_knight', name: 'Knight of Swords', suit: 'swords', cost: 9, type: 'minion', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_page', name: 'Page of Swords', suit: 'swords', cost: 8, type: 'minion', rarity: 'common', cardSet: 'minor' },

    // Minor Arcana - Pentacles
    { id: 'pentacles_01', name: 'Ace of Pentacles', suit: 'pentacles', cost: 1, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_02', name: 'Two of Pentacles', suit: 'pentacles', cost: 2, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_03', name: 'Three of Pentacles', suit: 'pentacles', cost: 3, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'pentacles_04', name: 'Four of Pentacles', suit: 'pentacles', cost: 4, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_05', name: 'Five of Pentacles', suit: 'pentacles', cost: 5, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_06', name: 'Six of Pentacles', suit: 'pentacles', cost: 6, type: 'spell', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'pentacles_07', name: 'Seven of Pentacles', suit: 'pentacles', cost: 7, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_08', name: 'Eight of Pentacles', suit: 'pentacles', cost: 8, type: 'spell', rarity: 'rare', cardSet: 'minor' },
    { id: 'pentacles_09', name: 'Nine of Pentacles', suit: 'pentacles', cost: 9, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_10', name: 'Ten of Pentacles', suit: 'pentacles', cost: 10, type: 'spell', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_king', name: 'King of Pentacles', suit: 'pentacles', cost: 11, type: 'minion', rarity: 'rare', cardSet: 'minor' },
    { id: 'pentacles_queen', name: 'Queen of Pentacles', suit: 'pentacles', cost: 10, type: 'minion', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'pentacles_knight', name: 'Knight of Pentacles', suit: 'pentacles', cost: 9, type: 'minion', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_page', name: 'Page of Pentacles', suit: 'pentacles', cost: 8, type: 'minion', rarity: 'common', cardSet: 'minor' },
];

// Sample decks for seeding
const sampleDecks = [
    { id: 'deck_standard', ownerId: 'user_demo', format: 'standard' },
    { id: 'deck_major', ownerId: 'user_demo', format: 'major' },
    { id: 'deck_casual', ownerId: 'user_demo', format: 'casual' },
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        await seed(db, {
            cards: tarotCards,
            decks: sampleDecks,
        });

        console.log('✅ Database seeded successfully!');
        console.log(`📊 Seeded ${tarotCards.length} cards and ${sampleDecks.length} decks`);

    } catch (error) {
        console.error('❌ Failed to seed database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run the seed function
seedDatabase();
