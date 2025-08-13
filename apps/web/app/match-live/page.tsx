'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type DeckId = 'classic' | 'marigold' | 'arcana-a' | 'duality-color' | 'duality-mono';

type StepEvent = { idx: number; intent: { type: string; playerId?: string; cardId?: string }; turn: number; visualCardId?: string; deck?: DeckId };

const DEFAULT_DECK: DeckId = 'classic';

function useSfx() {
    const cache = useRef<Map<string, HTMLAudioElement>>(new Map());
    function getAudio(name: string) {
        const key = name;
        if (!cache.current.has(key)) {
            const a = new Audio(`/api/sounds/effects/${name}`);
            a.preload = 'auto';
            cache.current.set(key, a);
        }
        return cache.current.get(key)!;
    }
    function play(name: string) {
        const base = getAudio(name);
        // Clone to allow overlapping
        const a = base.cloneNode(true) as HTMLAudioElement;
        void a.play().catch(() => { });
    }
    return { play };
}

function intentToSfx(intentType: string): string | null {
    switch (intentType) {
        case 'play_card':
            return 'card_place_01.wav';
        case 'draw':
            return 'card_draw_01.wav';
        case 'end_turn':
            return 'turn_change_01.wav';
        case 'peek':
            return 'card_reveal_01.wav';
        case 'force_draw':
            return 'card_draw_02.wav';
        case 'flip_orientation':
            return 'card_flip_01.wav';
        default:
            return 'card_flip_01.wav';
    }
}

export default function MatchLivePage() {
    const [deck, setDeck] = useState<DeckId>(DEFAULT_DECK);
    const [seed, setSeed] = useState('live-seed');
    const [steps, setSteps] = useState(20);
    const [themeId, setThemeId] = useState('pixel-pack');
    const [themes, setThemes] = useState<string[]>(['pixel-pack']);
    const [isStreaming, setIsStreaming] = useState(false);
    const [timeline, setTimeline] = useState<StepEvent[]>([]);
    const [result, setResult] = useState<{ winnerId: string | null; steps: number } | null>(null);
    const esRef = useRef<EventSource | null>(null);
    const { play } = useSfx();

    useEffect(() => {
        // Load themes list for selector
        (async () => {
            try {
                const r = await fetch('/api/ui/themes', { cache: 'no-store' });
                const j = await r.json();
                if (Array.isArray(j.themes) && j.themes.length) setThemes(j.themes);
            } catch { }
        })();
        return () => {
            esRef.current?.close();
            esRef.current = null;
        };
    }, []);

    function onStart() {
        if (esRef.current) esRef.current.close();
        setTimeline([]);
        setResult(null);
        const url = `/api/match/stream?seed=${encodeURIComponent(seed)}&p1=U1&p2=U2&steps=${encodeURIComponent(String(steps))}&deck=${encodeURIComponent(deck)}`;
        const es = new EventSource(url);
        esRef.current = es;
        setIsStreaming(true);
        es.addEventListener('step', (ev) => {
            try {
                const step = JSON.parse((ev as MessageEvent).data) as StepEvent;
                setTimeline((prev) => [...prev.slice(-24), step]);
                const sfx = intentToSfx(step.intent?.type ?? '');
                if (sfx) play(sfx);
            } catch {
                /* ignore */
            }
        });
        es.addEventListener('done', (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data) as { ok: boolean; winnerId: string | null; steps: number };
                setResult({ winnerId: data.winnerId ?? null, steps: data.steps ?? timeline.length });
            } catch { }
            es.close();
            esRef.current = null;
            setIsStreaming(false);
        });
    }

    function onStop() {
        esRef.current?.close();
        esRef.current = null;
        setIsStreaming(false);
    }

    const lastCardId = useMemo(() => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            const cid = timeline[i]?.visualCardId || timeline[i]?.intent?.cardId;
            if (cid) return cid;
        }
        return null;
    }, [timeline]);

    return (
        <div
            className="p-4 space-y-4 min-h-screen text-gray-100"
            style={{
                backgroundColor: '#000',
                backgroundImage: `url(/api/ui/themes/${encodeURIComponent(themeId)}/backgrounds/table_bg_03.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <h1 className="text-xl font-semibold">Match Live</h1>
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-300">Seed</label>
                    <input className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1" value={seed} onChange={(e) => setSeed(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1 w-28">
                    <label className="text-sm text-gray-300">Steps</label>
                    <input type="number" min={1} max={200} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1" value={steps} onChange={(e) => setSteps(Number(e.target.value || 0))} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-300">Deck</label>
                    <select className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1" value={deck} onChange={(e) => setDeck(e.target.value as DeckId)}>
                        <option value="classic">classic</option>
                        <option value="marigold">marigold</option>
                        <option value="arcana-a">arcana-a</option>
                        <option value="duality-color">duality-color</option>
                        <option value="duality-mono">duality-mono</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-300">Theme</label>
                    <select className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                        {themes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <Button onClick={onStart} disabled={isStreaming}>Start</Button>
                    <Button onClick={onStop} disabled={!isStreaming} variant="secondary">Stop</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-800 p-3">
                    <h2 className="mb-2 font-medium">Last Play</h2>
                    <div className="h-56 flex items-center justify-center bg-zinc-950 rounded border border-zinc-900">
                        {lastCardId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`/api/card-image?id=${encodeURIComponent(lastCardId)}&deck=${encodeURIComponent(deck)}`}
                                alt={lastCardId}
                                width={144}
                                height={216}
                                className="rounded shadow-lg shadow-black/50 border border-zinc-700 object-contain"
                            />
                        ) : (
                            <div className="text-sm text-gray-400">No card played yet…</div>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-zinc-800 p-3">
                    <h2 className="mb-2 font-medium">Timeline</h2>
                    <ul className="text-sm max-h-56 overflow-auto pr-2 space-y-1">
                        {timeline.map((s) => (
                            <li key={s.idx} className="text-gray-300">
                                <span className="text-gray-500">#{s.idx}</span> turn {s.turn} — {s.intent?.type}
                                {s.intent?.cardId ? <span> ({s.intent.cardId})</span> : null}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 text-sm text-gray-300">
                        {result ? (
                            <span>
                                Winner: <strong>{result.winnerId ?? 'none'}</strong> in {result.steps} steps
                            </span>
                        ) : (
                            <span>—</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


