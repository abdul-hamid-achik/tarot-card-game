import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './lib/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Database connection for migrations
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

async function runMigrations() {
    try {
        console.log('Running migrations...');

        await migrate(db, { migrationsFolder: './migrations' });

        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();
