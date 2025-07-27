"use client";

import { useState } from 'react';

export function ResultPoll() {
  const [userId, setUserId] = useState('demo_user');
  const [winner, setWinner] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');

  async function pollOnce(uid: string) {
    const res = await fetch(`/api/match/result?userId=${encodeURIComponent(uid)}`);
    const data = await res.json();
    return data.result as { status: string; winnerId: string | null } | null;
  }

  async function onPoll() {
    setStatus('polling');
    setWinner(null);
    for (let i = 0; i < 20; i++) {
      const r = await pollOnce(userId);
      if (r && r.status === 'done') {
        setWinner(r.winnerId ?? null);
        setStatus('done');
        return;
      }
      await new Promise((r2) => setTimeout(r2, 200));
    }
    setStatus('timeout');
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Poll Match Result</h3>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} />
      <button onClick={onPoll} style={{ marginLeft: 8 }}>Poll</button>
      <span style={{ marginLeft: 8 }}>Status: {status}</span>
      {status === 'done' && <p>Winner: {String(winner)}</p>}
    </section>
  );
}
