'use client';

import { useEffect, useMemo, useState } from 'react';

type MatchState = {
    matchId: string;
    seed: string;
    players: string[];
    turn: number;
    fate: Record<string, number>;
    phase?: 'draw' | 'main' | 'combat' | 'end';
};

export default function MatchDemoPage() {
    const [state, setState] = useState<MatchState | null>(null);
    const [lastStep, setLastStep] = useState<any>(null);
    const players = state?.players ?? [];

    useEffect(() => {
        (async () => {
            const res = await fetch('/api/match/start', { method: 'POST', body: JSON.stringify({ seed: 'demo-seed', players: ['U1', 'U2'] }) });
            const data = await res.json();
            setState(data.state);
        })();
    }, []);

    const startStream = async () => {
        const url = `/api/match/stream?seed=demo-seed&p1=${encodeURIComponent(players[0] ?? 'U1')}&p2=${encodeURIComponent(players[1] ?? 'U2')}&steps=10`;
        const es = new EventSource(url);
        es.addEventListener('step', (ev) => {
            try {
                const step = JSON.parse((ev as MessageEvent).data);
                setLastStep(step);
            } catch { }
        });
        es.addEventListener('done', () => es.close());
    };

    return (
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <h1>Match Demo</h1>
            {!state && <div>Loading…</div>}
            {state && (
                <div style={{ display: 'grid', gap: 8 }}>
                    <div>
                        <strong>Match:</strong> {state.matchId} | <strong>Seed:</strong> {state.seed}
                    </div>
                    <div>
                        <strong>Turn:</strong> {state.turn} | <strong>Phase:</strong> {state.phase ?? '-'}
                    </div>
                    <div>
                        <strong>Players:</strong> {players.join(', ')}
                    </div>
                    <div>
                        <strong>Fate:</strong> {players.map((p) => `${p}:${state.fate[p] ?? 0}`).join('  ')}
                    </div>
                    <div>
                        <button onClick={startStream}>Play 10 scripted steps</button>
                    </div>
                    {lastStep && (
                        <pre style={{ background: '#111', color: '#0f0', padding: 8, borderRadius: 6 }}>
                            {JSON.stringify(lastStep, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}


