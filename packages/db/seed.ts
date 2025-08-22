import { reset } from 'drizzle-seed';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/schema';
import fs from 'fs/promises';
import path from 'path';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// Base Tarot card catalog (IDs and names), detailed values will be generated per-archetype
// Types will be assigned below per card based on role rules
const tarotCards = [
    // Major Arcana
    { id: 'major_00', name: 'The Fool', suit: 'major', cost: 0, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_01', name: 'The Magician', suit: 'major', cost: 1, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_02', name: 'The High Priestess', suit: 'major', cost: 2, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_03', name: 'The Empress', suit: 'major', cost: 3, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_04', name: 'The Emperor', suit: 'major', cost: 4, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_05', name: 'The Hierophant', suit: 'major', cost: 5, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_06', name: 'The Lovers', suit: 'major', cost: 6, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_07', name: 'The Chariot', suit: 'major', cost: 7, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_08', name: 'Strength', suit: 'major', cost: 8, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_09', name: 'The Hermit', suit: 'major', cost: 9, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_10', name: 'Wheel of Fortune', suit: 'major', cost: 10, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_11', name: 'Justice', suit: 'major', cost: 11, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_12', name: 'The Hanged Man', suit: 'major', cost: 12, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_13', name: 'Death', suit: 'major', cost: 13, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_14', name: 'Temperance', suit: 'major', cost: 14, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_15', name: 'The Devil', suit: 'major', cost: 15, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_16', name: 'The Tower', suit: 'major', cost: 16, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_17', name: 'The Star', suit: 'major', cost: 17, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_18', name: 'The Moon', suit: 'major', cost: 18, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_19', name: 'The Sun', suit: 'major', cost: 19, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_20', name: 'Judgement', suit: 'major', cost: 20, type: 'spell', rarity: 'legendary', cardSet: 'major' },
    { id: 'major_21', name: 'The World', suit: 'major', cost: 21, type: 'spell', rarity: 'legendary', cardSet: 'major' },

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
    { id: 'wands_king', name: 'King of Wands', suit: 'wands', cost: 11, type: 'unit', rarity: 'rare', cardSet: 'minor' },
    { id: 'wands_queen', name: 'Queen of Wands', suit: 'wands', cost: 10, type: 'unit', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'wands_knight', name: 'Knight of Wands', suit: 'wands', cost: 9, type: 'unit', rarity: 'common', cardSet: 'minor' },
    { id: 'wands_page', name: 'Page of Wands', suit: 'wands', cost: 8, type: 'unit', rarity: 'common', cardSet: 'minor' },

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
    { id: 'cups_king', name: 'King of Cups', suit: 'cups', cost: 11, type: 'unit', rarity: 'rare', cardSet: 'minor' },
    { id: 'cups_queen', name: 'Queen of Cups', suit: 'cups', cost: 10, type: 'unit', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'cups_knight', name: 'Knight of Cups', suit: 'cups', cost: 9, type: 'unit', rarity: 'common', cardSet: 'minor' },
    { id: 'cups_page', name: 'Page of Cups', suit: 'cups', cost: 8, type: 'unit', rarity: 'common', cardSet: 'minor' },

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
    { id: 'swords_king', name: 'King of Swords', suit: 'swords', cost: 11, type: 'unit', rarity: 'rare', cardSet: 'minor' },
    { id: 'swords_queen', name: 'Queen of Swords', suit: 'swords', cost: 10, type: 'unit', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'swords_knight', name: 'Knight of Swords', suit: 'swords', cost: 9, type: 'unit', rarity: 'common', cardSet: 'minor' },
    { id: 'swords_page', name: 'Page of Swords', suit: 'swords', cost: 8, type: 'unit', rarity: 'common', cardSet: 'minor' },

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
    { id: 'pentacles_king', name: 'King of Pentacles', suit: 'pentacles', cost: 11, type: 'unit', rarity: 'rare', cardSet: 'minor' },
    { id: 'pentacles_queen', name: 'Queen of Pentacles', suit: 'pentacles', cost: 10, type: 'unit', rarity: 'uncommon', cardSet: 'minor' },
    { id: 'pentacles_knight', name: 'Knight of Pentacles', suit: 'pentacles', cost: 9, type: 'unit', rarity: 'common', cardSet: 'minor' },
    { id: 'pentacles_page', name: 'Page of Pentacles', suit: 'pentacles', cost: 8, type: 'unit', rarity: 'common', cardSet: 'minor' },
];

// Asset-backed decks (5 decks)
const assetDeckPaths = [
    'packages/assets/decks/classic/deck.json',
    'packages/assets/decks/marigold/deck.json',
    'packages/assets/decks/arcana-a/deck.json',
    'packages/assets/decks/duality-mono/deck.json',
    'packages/assets/decks/duality-color/deck.json',
] as const;

type AssetDeck = {
    deckId: string;
    displayName?: string;
    cards: { id: string; slug?: string; images?: Record<string, string> }[];
};

// Simple deterministic RNG utilities (mulberry32)
function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

// Theme rules per suit
const THEME_RULES = {
    wands: {
        unitAttack: [3, 6] as [number, number],
        unitHealth: [1, 4] as [number, number],
        keywords: ['quick-attack', 'overwhelm'] as string[],
        spellTypes: ['fast', 'spell'] as string[],
    },
    cups: {
        unitAttack: [1, 3] as [number, number],
        unitHealth: [3, 6] as [number, number],
        keywords: ['lifesteal', 'tough', 'barrier'] as string[],
        spellTypes: ['burst', 'spell'] as string[],
    },
    swords: {
        unitAttack: [2, 5] as [number, number],
        unitHealth: [2, 4] as [number, number],
        keywords: ['quick-attack', 'challenger', 'elusive'] as string[],
        spellTypes: ['fast', 'slow', 'spell'] as string[],
    },
    pentacles: {
        unitAttack: [1, 3] as [number, number],
        unitHealth: [4, 7] as [number, number],
        keywords: ['tough', 'regeneration', 'barrier'] as string[],
        spellTypes: ['slow', 'spell'] as string[],
    },
    major: {
        unitAttack: [4, 7] as [number, number],
        unitHealth: [4, 8] as [number, number],
        keywords: ['spellshield', 'overwhelm', 'fury', 'lifesteal'] as string[],
        spellTypes: ['fast', 'burst'] as string[],
    },
} as const;

function isCourt(id: string): boolean {
    return /_(king|queen|knight|page)$/.test(id);
}

function getSuitFromId(id: string): keyof typeof THEME_RULES {
    if (id.startsWith('wands_')) return 'wands';
    if (id.startsWith('cups_')) return 'cups';
    if (id.startsWith('swords_')) return 'swords';
    if (id.startsWith('pentacles_')) return 'pentacles';
    return 'major';
}

function generateCardForId(id: string, baseSeed = 1337) {
    const suit = getSuitFromId(id);
    const rules = THEME_RULES[suit];
    const rng = mulberry32((hashString(id) ^ baseSeed) >>> 0);

    const isNumberedMinor = /_(0[1-9]|10)$/.test(id) && suit !== 'major';
    const court = isCourt(id);

    // Decide card type
    let type: 'unit' | 'spell' | 'fast' | 'burst' | 'slow' = 'unit';
    if (suit === 'major') {
        // Champions: mostly units, some are spells
        type = rng() < 0.8 ? 'unit' : (pick(rng, rules.spellTypes) as any);
    } else if (court) {
        type = 'unit';
    } else if (isNumberedMinor) {
        // Numbered minors: often spells, sometimes units
        type = rng() < 0.7 ? (pick(rng, rules.spellTypes) as any) : 'unit';
    } else {
        type = 'unit';
    }

    // Cost curve
    const cost = Math.max(0, randInt(rng, 0, suit === 'major' ? 10 : 8));

    // Stats and keywords for units
    let attack: number | null = null;
    let health: number | null = null;
    let keywords: string[] = [];

    if (type === 'unit') {
        const [amin, amax] = rules.unitAttack;
        const [hmin, hmax] = rules.unitHealth;
        attack = randInt(rng, amin, amax);
        health = randInt(rng, hmin, hmax);
        // Random effects: some units vanilla with no effects
        if (rng() < 0.65) {
            // 1-2 keywords
            const kw1 = pick(rng, rules.keywords);
            keywords.push(kw1);
            if (rng() < 0.35) {
                let kw2 = pick(rng, rules.keywords);
                if (kw2 === kw1) kw2 = pick(rng, rules.keywords);
                if (!keywords.includes(kw2)) keywords.push(kw2);
            }
        }
    }

    // Rarity
    const rarity = suit === 'major' ? 'legendary' : pick(rng, ['common', 'uncommon', 'rare']);

    // Name placeholder (can be overridden later if needed)
    const name = id
        .replace('major_', 'Major ')
        .replace('wands_', 'Wands ')
        .replace('cups_', 'Cups ')
        .replace('swords_', 'Swords ')
        .replace('pentacles_', 'Pentacles ')
        .replace('_', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
        id,
        name,
        suit,
        cost,
        type,
        attack: attack ?? undefined,
        health: health ?? undefined,
        keywords: keywords.length ? keywords : undefined,
        rarity,
        cardSet: suit === 'major' ? 'major' : 'minor',
    } as const;
}

async function loadAssetDecks(): Promise<AssetDeck[]> {
    const decks: AssetDeck[] = [];
    for (const rel of assetDeckPaths) {
        const abs = path.resolve(process.cwd(), rel);
        const raw = await fs.readFile(abs, 'utf-8');
        const parsed = JSON.parse(raw) as AssetDeck;
        decks.push(parsed);
    }
    return decks;
}

function buildDecklistFromAssets(
    asset: AssetDeck,
    allCardIds: Set<string>,
    rng: () => number
): string[] {
    // Build a 30-card deck with constraints: max 2 Major Arcana
    const ids = asset.cards.map((c) => c.id).filter((id) => allCardIds.has(id));
    const majors = ids.filter((id) => id.startsWith('major_'));
    const minors = ids.filter((id) => !id.startsWith('major_'));

    const deck: string[] = [];
    let majorCount = 0;

    // Ensure at least 1 major if available
    if (majors.length > 0) {
        deck.push(pick(rng, majors));
        majorCount = 1;
    }

    while (deck.length < 30) {
        const pool = rng() < 0.2 && majorCount < 2 && majors.length > 0 ? majors : minors;
        if (pool.length === 0) break;
        const next = pick(rng, pool);
        deck.push(next);
        if (next.startsWith('major_')) majorCount++;
    }

    // If still short (small asset decks), pad with minors
    while (deck.length < 30 && minors.length > 0) {
        deck.push(pick(rng, minors));
    }

    return deck.slice(0, 30);
}

async function seedDatabase() {
    try {
        console.log('🌱 Starting database reset...');
        // Use drizzle-seed to truncate all tables defined in schema
        await reset(db, schema);

        console.log('🌱 Loading asset decks...');
        const assets = await loadAssetDecks();

        // Collect unique card ids from assets and base tarot catalog
        const cardIdSet = new Set<string>();
        for (const c of tarotCards) cardIdSet.add(c.id);
        for (const deck of assets) for (const c of deck.cards) cardIdSet.add(c.id);

        console.log(`🎴 Unique cards from assets: ${cardIdSet.size}`);

        // Generate detailed card entries deterministically per id
        const seedBase = Number(process.env.SEED_BASE || 20250822);
        const generatedCards = Array.from(cardIdSet).map((id) => generateCardForId(id, seedBase));

        console.log('🌱 Inserting generated card data...');

        // Insert cards deterministically
        await db
            .insert(schema.cards)
            .values(generatedCards)
            .onConflictDoNothing({ target: schema.cards.id });

        console.log('🃏 Building and inserting 5 asset-based player decks...');
        const deckRows = assets.map((asset) => {
            const rng = mulberry32((hashString(asset.deckId) ^ seedBase) >>> 0);
            const deckCards = buildDecklistFromAssets(asset, cardIdSet, rng);
            return {
                id: `deck_${asset.deckId}`,
                userId: 'user_demo',
                name: asset.displayName || asset.deckId,
                format: 'standard',
                cards: deckCards.map((cardId) => ({ cardId, quantity: 1 } as any)),
                coverCard: deckCards.find((c) => c.startsWith('major_')) || deckCards[0],
            };
        });

        await db.insert(schema.playerDecks).values(deckRows).onConflictDoNothing({ target: schema.playerDecks.id });

        console.log('✅ Database seeded successfully!');
        console.log(`📊 Seeded ${generatedCards.length} cards and ${deckRows.length} decks`);

    } catch (error) {
        console.error('❌ Failed to seed database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run the seed function
seedDatabase();
