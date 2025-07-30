"use client";

import { useState } from 'react';

export function SeedCards() {
  const [status, setStatus] = useState('idle');
  const [count, setCount] = useState<number | null>(null);

  async function onSeed() {
    setStatus('seeding');
    const res = await fetch('/api/admin/seed-cards', { method: 'POST' });
    const data = await res.json();
    setCount(data.count ?? null);
    setStatus('done');
  }

  return (
    <section style={{ marginTop: 8 }}>
      <button onClick={onSeed} disabled={status === 'seeding'}>Seed demo cards</button>
      <span style={{ marginLeft: 8 }}>Status: {status}</span>
      {count !== null && <span style={{ marginLeft: 8 }}>Seeded: {count}</span>}
    </section>
  );
}
