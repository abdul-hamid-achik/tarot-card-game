"use client";

import { useState } from 'react';

export function HeadlessDemo() {
  const [result, setResult] = useState<{ winnerId: string | null; steps: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/headless', { method: 'POST', body: JSON.stringify({ seed: 'seed-demo' }) });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setResult({ winnerId: data.winnerId ?? null, steps: data.steps ?? 0 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <button onClick={runDemo} disabled={loading}>
        {loading ? 'Running…' : 'Run Headless Demo'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <p>
          Winner: {result.winnerId ?? 'none'} in {result.steps} steps
        </p>
      )}
    </section>
  );
}
