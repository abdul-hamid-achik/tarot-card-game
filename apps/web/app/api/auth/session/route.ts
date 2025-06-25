import { NextResponse } from 'next/server';

export function GET() {
  // Mock session; later replace with NextAuth/OAuth providers
  return NextResponse.json({ user: { id: 'u_demo', name: 'Demo User' }, loggedIn: true });
}
