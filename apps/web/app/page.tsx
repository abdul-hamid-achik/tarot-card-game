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
    <main className="p-6 space-y-4">
      <h1>Tarot TCG</h1>
      <p>Welcome. API health is at <code>/api/health</code>.</p>
      <SessionInfo />
      <h2>Cards</h2>
      <ul className="list-disc pl-6">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <img
              src={`/api/card-image?id=${encodeURIComponent(c.id)}`}
              alt={c.name}
              width={48}
              height={72}
              className="rounded border border-gray-200 object-cover"
            />
            <span>{c.name}</span>
          </li>
        ))}
      </ul>
      <h2>Decks</h2>
      <p>Total decks: {decks.length}</p>
      <ul className="list-disc pl-6">
        {decks.map((d) => (
          <li key={d.id}>{d.id}</li>
        ))}
      </ul>
      <SeedDeck />
      <SeedCards />
      <form action="/api/match/queue" method="post" className="mt-4">
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
