async function fetchCards() {
  const res = await fetch('http://localhost:3000/api/cards', { cache: 'no-store' });
  if (!res.ok) return [] as { id: string; name: string }[];
  const data = await res.json();
  return data.cards as { id: string; name: string }[];
}

async function fetchDecks() {
  const res = await fetch('http://localhost:3000/api/decks', { cache: 'no-store' });
  if (!res.ok) return [] as { id: string; cards: string[] }[];
  const data = await res.json();
  return data.decks as { id: string; cards: string[] }[];
}

import { HeadlessDemo } from './components/HeadlessDemo';
import { Button } from '@/components/ui/button';
import { SessionInfo } from './components/SessionInfo';
import { MatchStream } from './components/MatchStream';
import { StartMatch } from './components/StartMatch';
import { ResultPoll } from './components/ResultPoll';
import { SeedDeck } from './components/SeedDeck';
import { SeedCards } from './components/SeedCards';

export default async function HomePage() {
  const [cards, decks] = await Promise.all([fetchCards(), fetchDecks()]);
  return (
    <main className="p-2 md:p-4 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-wide text-amber-200">Tarot TCG</h1>
        <span className="text-xs text-muted-foreground">API health at <code>/api/health</code></span>
      </div>
      <SessionInfo />
      <h2 className="text-lg font-semibold text-amber-100">Cards</h2>
      <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-lg border border-amber-900/30 bg-black/30 p-3">
            <img
              src={`/api/card-image?id=${encodeURIComponent(c.id)}`}
              alt={c.name}
              width={48}
              height={72}
              className="rounded border border-amber-900/30 object-cover shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-sm text-amber-100">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.id}</div>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="text-lg font-semibold text-amber-100">Decks</h2>
      <p className="text-sm text-muted-foreground">Total decks: {decks.length}</p>
      <ul className="grid sm:grid-cols-2 gap-3">
        {decks.map((d) => (
          <li key={d.id} className="rounded-lg border border-amber-900/30 bg-black/30 p-3 text-sm text-amber-100">{d.id}</li>
        ))}
      </ul>
      <SeedDeck />
      <SeedCards />
      <form action="/api/match/queue" method="post" className="mt-6">
        <input type="hidden" name="userId" value="demo_user" />
        <Button formAction="/api/match/queue" formMethod="post">Queue Match</Button>
      </form>
      {/* Client-enhanced button for demo */}
      <HeadlessDemo />
      <StartMatch />
      <ResultPoll />
      <MatchStream />
    </main>
  );
}
