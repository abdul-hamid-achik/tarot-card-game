# Tarot Card Game Web App

Next.js application with Drizzle ORM and Neon PostgreSQL for the Tarot card game.

## Setup Instructions

### 1. Environment Setup

Copy the environment template and fill in your database credentials:

```bash
cp env.local.template .env.local
```

For local development with Docker:
```env
DATABASE_URL=postgresql://postgres:password@localhost:55432/tarot_dev
```

### 3. Database Setup

Install dependencies:
```bash
npm install
```

Generate and run migrations:
```bash
# Generate migration files from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Or push schema directly (development only)
npm run db:push
```

Seed the database with demo data:
```bash
npm run db:seed
```

### 4. Development

Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

### 5. Database Management

```bash
# View/edit database in browser
npm run db:studio

# Generate new migration after schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate
```

### 6. Production Deployment

For Vercel deployment:

1. Set your `DATABASE_URL` environment variable in Vercel dashboard
2. Push your schema changes and generate migrations locally
3. Run migrations on your production database before deploying

### Database Schema

- `cards`: Tarot card definitions (id, name, suit, cost, type, rarity, card_set)
- `decks`: User decks (id, owner_id, format)

### Troubleshooting

**Connection Issues:**
- Ensure Docker is running for local development
- Check DATABASE_URL format and credentials (shown in neon_local logs)
- Verify neon_local container is healthy: `docker-compose ps`

**Migration Issues:**
- Reset database: `docker-compose down -v && docker-compose up -d neon-local`
- Re-run migrations: `npm run db:migrate`

**Build Issues:**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`
