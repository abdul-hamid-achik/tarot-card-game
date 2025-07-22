import { NextResponse } from 'next/server';
import { getResultForUser } from '@/lib/matchStore';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') ?? 'anon';
  const result = getResultForUser(userId);
  return NextResponse.json({ result });
}
