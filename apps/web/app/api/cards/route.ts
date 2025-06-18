import { NextResponse } from 'next/server';

const MOCK_CARDS = [
  {
    id: 'swords_02',
    name: 'two of swords',
    suit: 'swords',
    cost: 2,
    type: 'spell',
    upright: { effect: 'silence(target,1)' },
    reversed: { effect: 'both_discard_random(1)' },
    tags: ['control', 'discard'],
    rarity: 'common',
    set: 'base',
  },
];

export function GET() {
  return NextResponse.json({ cards: MOCK_CARDS });
}
