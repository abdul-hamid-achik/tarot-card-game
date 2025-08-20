import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlite = getSqlite();
    const stmt = sqlite.prepare('SELECT id, owner_id as ownerId, format FROM decks');
    const decks = await stmt.all();
    return NextResponse.json({ decks });
  } catch (error) {
    console.error('Failed to fetch decks:', error);
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 });
  }
}
