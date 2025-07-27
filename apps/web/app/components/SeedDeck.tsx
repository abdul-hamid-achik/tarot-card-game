"use client";

import { useState } from 'react';

export function SeedDeck() {
  const [status, setStatus] = useState<string>('idle');
  const [count, setCount] = useState<number | null>(null);

  async function refreshCount() {
    const res = await fetch('/api/decks', { cache: 'no-store' });
    const data = await res.json();
    const decks = (data.decks as { id: string; ownerId?: string; format?: string }[]);
    setCount(decks.length);
  }

  async function onSeed() {
    setStatus('seeding');
    await fetch('/api/admin/seed-deck', { method: 'POST' });
    setStatus('done');
    await refreshCount();
  }

  return (
    <section style={{ marginTop: 8 }}>
      <button onClick={onSeed} disabled={status === 'seeding'}>Seed demo deck</button>
      <span style={{ marginLeft: 8 }}>Status: {status}</span>
      {count !== null && <span style={{ marginLeft: 8 }}>Decks now: {count}</span>}
    </section>
  );
}
