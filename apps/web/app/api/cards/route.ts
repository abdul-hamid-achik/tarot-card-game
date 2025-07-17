import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  // @ts-expect-error better-sqlite3 via drizzle adapter
  const cards = db.all?.("SELECT id, name, suit, cost, type, rarity, set FROM cards") ?? [];
  return NextResponse.json({ cards });
}
