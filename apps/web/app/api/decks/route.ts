import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  // @ts-expect-error drizzle better-sqlite3 direct query
  const decks = db.all?.("SELECT id, owner_id as ownerId, format FROM decks") ?? [];
  return NextResponse.json({ decks });
}
