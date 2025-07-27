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
import { SessionInfo } from './components/SessionInfo';
import { MatchStream } from './components/MatchStream';
import { StartMatch } from './components/StartMatch';
import { ResultPoll } from './components/ResultPoll';

export default async function HomePage() {
  const [cards, decks] = await Promise.all([fetchCards(), fetchDecks()]);
  return (
    <main style={{ padding: 24 }}>
      <h1>Tarot TCG</h1>
      <p>Welcome. API health is at <code>/api/health</code>.</p>
      <SessionInfo />
      <h2>Cards</h2>
      <ul>
        {cards.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <h2>Decks</h2>
      <p>Total decks: {decks.length}</p>
      <ul>
        {decks.map((d) => (
          <li key={d.id}>{d.id}</li>
        ))}
      </ul>
      <form action="/api/match/queue" method="post" style={{ marginTop: 16 }}>
        <input type="hidden" name="userId" value="demo_user" />
        <button formAction="/api/match/queue" formMethod="post">Queue Match</button>
      </form>
      {/* Client-enhanced button for demo */}
      <HeadlessDemo />
      <StartMatch />
      <ResultPoll />
      <MatchStream />
    </main>
  );
}
