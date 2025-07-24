"use client";

import { useState } from 'react';

export function StartMatch() {
  const [seed, setSeed] = useState('ui-seed-1');
  const [result, setResult] = useState<{ winnerId: string | null; steps: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onStart() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, players: ['U1', 'U2'] }),
      });
      const data = await res.json();
      setResult(data.match ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Start Match (Headless)</h3>
      <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="seed" />
      <button disabled={loading} onClick={onStart} style={{ marginLeft: 8 }}>
        {loading ? 'Starting…' : 'Start'}
      </button>
      {result && (
        <p>
          Winner: {String(result.winnerId)} in {result.steps} steps
        </p>
      )}
    </section>
  );
}
