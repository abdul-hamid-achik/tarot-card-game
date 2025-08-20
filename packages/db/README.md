# @tarot/db

Database package for the Tarot Card Game using Drizzle ORM with PostgreSQL.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your database:
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://username:password@localhost:5432/tarot_db"

# Generate migrations from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

## Available Scripts

- `npm run db:generate` - Generate database migrations from schema changes
- `npm run db:migrate` - Run pending database migrations
- `npm run db:push` - Push schema changes directly to database (development)
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm run db:seed` - Seed database with sample tarot card data

## Database Schema

The database contains two main tables:

- `cards` - Tarot cards with properties like name, suit, cost, type, rarity, and card set
- `decks` - User decks with owner information and format

## Usage

```typescript
import { database } from '@tarot/db';

// Get all cards
const cards = await database.getCards();

// Create a new card
const card = await database.createCard({
  name: 'New Card',
  suit: 'major',
  cost: 5,
  type: 'spell',
  rarity: 'rare',
  cardSet: 'custom'
});

// Get cards by ID
const specificCard = await database.getCardById('major_00');
```

## Seeding

The `seed.ts` file contains comprehensive sample data including:

- All 78 tarot cards (22 Major Arcana + 56 Minor Arcana)
- Sample deck configurations
- Proper data types and relationships

Run seeding with:
```bash
npm run db:seed
```

## Development

When making schema changes:

1. Update `src/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply changes
4. Optionally run `npm run db:seed` to populate with sample data
