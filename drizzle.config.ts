import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './packages/db/src/schema.ts',
    out: './packages/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
    migrations: {
        prefix: 'timestamp',
        table: '__drizzle_migrations__',
    },
});
