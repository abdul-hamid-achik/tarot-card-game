import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@tarot/db';

let db: ReturnType<typeof drizzle> | null = null;
let sqliteRaw: any | null = null;

export function getDb() {
  if (!db) {
    // Use require to avoid top-level await and keep type loose for build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite = require('better-sqlite3');
    sqliteRaw = new BetterSqlite(':memory:');
    db = drizzle(sqliteRaw, { schema });
    initDb();
  }
  return db;
}

export function resetDb() {
  if (!sqliteRaw) return;
  sqliteRaw.prepare('DELETE FROM cards').run();
  sqliteRaw.prepare('DELETE FROM decks').run();
  initDb();
}

function initDb() {
  if (!sqliteRaw) return;
  sqliteRaw.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      suit TEXT NOT NULL,
      cost INTEGER NOT NULL,
      type TEXT NOT NULL,
      rarity TEXT NOT NULL,
      card_set TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      format TEXT NOT NULL
    );
  `);
  const row = sqliteRaw.prepare('SELECT COUNT(1) as c FROM cards').get() as { c: number } | undefined;
  const count = row?.c ?? 0;
  if (count === 0) {
    sqliteRaw
      .prepare('INSERT INTO cards (id, name, suit, cost, type, rarity, card_set) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('swords_02', 'two of swords', 'swords', 2, 'spell', 'common', 'base');
    sqliteRaw
      .prepare('INSERT INTO decks (id, owner_id, format) VALUES (?, ?, ?)')
      .run('deck_123', 'u_demo', 'standard');
  }
}

export function getSqlite() {
  if (!sqliteRaw) getDb();
  return sqliteRaw!;
}
