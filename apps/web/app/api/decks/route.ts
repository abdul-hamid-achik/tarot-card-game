import { NextResponse } from 'next/server';

const MOCK_DECKS = [
  {
    id: 'deck_123',
    ownerId: 'u_abc',
    cards: ['swords_02', 'cups_05'],
    majors: ['death_13'],
    format: 'standard',
  },
];

export function GET() {
  return NextResponse.json({ decks: MOCK_DECKS });
}
