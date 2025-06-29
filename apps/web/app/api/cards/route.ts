import { NextResponse } from 'next/server';
import { listCardsMock } from './drizzle';

export function GET() {
  const cards = listCardsMock();
  return NextResponse.json({ cards });
}
