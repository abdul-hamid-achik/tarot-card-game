async function fetchCards() {
  const res = await fetch('http://localhost:3000/api/cards', { cache: 'no-store' });
  if (!res.ok) return [] as { id: string; name: string }[];
  const data = await res.json();
  return data.cards as { id: string; name: string }[];
}

export default async function HomePage() {
  const cards = await fetchCards();
  return (
    <main style={{ padding: 24 }}>
      <h1>Tarot TCG</h1>
      <p>Welcome. API health is at <code>/api/health</code>.</p>
      <h2>Cards</h2>
      <ul>
        {cards.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    </main>
  );
}
