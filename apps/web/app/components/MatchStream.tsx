"use client";

import { useEffect, useState } from 'react';

export function MatchStream() {
  const [events, setEvents] = useState<string[]>([]);
  useEffect(() => {
    const es = new EventSource('/api/match/stream');
    es.onmessage = (ev) => {
      setEvents((prev) => [...prev, ev.data]);
    };
    return () => es.close();
  }, []);
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Match Stream</h3>
      <ul>
        {events.map((e, idx) => (
          <li key={idx}>{e}</li>
        ))}
      </ul>
    </section>
  );
}
