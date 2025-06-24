"use client";

import { useEffect, useState } from 'react';

export function SessionInfo() {
  const [session, setSession] = useState<{ user: { id: string; name: string }; loggedIn: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  if (!session) return null;
  return (
    <p style={{ marginTop: 12 }}>Logged in as <strong>{session.user.name}</strong> ({session.user.id})</p>
  );
}
