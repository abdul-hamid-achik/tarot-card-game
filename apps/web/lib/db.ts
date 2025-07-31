import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@tarot/db';

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    initDb(db);
  }
  return db;
}

export function resetDb() {
  if (!db) return;
  // @ts-expect-error raw SQL
  db.run?.("DELETE FROM cards");
  // @ts-expect-error raw SQL
  db.run?.("DELETE FROM decks");
  initDb(db);
}

function initDb(d: ReturnType<typeof drizzle>) {
  // Minimal schema init and seed (cards, decks tables exist in schema)
  // @ts-expect-error drizzle typed queries (raw SQL)
  d.run?.("CREATE TABLE IF NOT EXISTS cards (id text primary key, name text not null, suit text not null, cost integer not null, type text not null, rarity text not null, set text not null)");
  // @ts-expect-error raw SQL
  d.run?.("CREATE TABLE IF NOT EXISTS decks (id text primary key, owner_id text not null, format text not null)");
  // Seed one card if empty
  // @ts-expect-error raw SQL
  const row = d.get?.("SELECT COUNT(1) as c FROM cards") as unknown as { c: number } | undefined;
  const count = row?.c ?? 0;
  if (count === 0) {
    // @ts-expect-error raw SQL
    d.run?.("INSERT INTO cards (id, name, suit, cost, type, rarity, set) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      'swords_02', 'two of swords', 'swords', 2, 'spell', 'common', 'base',
    ]);
    // @ts-expect-error raw SQL
    d.run?.("INSERT INTO decks (id, owner_id, format) VALUES (?, ?, ?)", [
      'deck_123', 'u_demo', 'standard',
    ]);
  }
}
