"use client";

import { useEffect, useState } from 'react';

export default function PlayPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/godot/index.html', { method: 'HEAD', cache: 'no-store' });
        if (!cancelled) setAvailable(res.ok);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-[80vh] grid gap-4 p-2 md:p-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-wide text-amber-200">Play</h1>
        <span className="text-xs text-muted-foreground">Godot HTML5</span>
      </div>
      {available === true && (
        <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-amber-900/30 bg-black/40 shadow-[0_0_0_1px_rgba(251,191,36,0.05),0_10px_40px_-12px_rgba(0,0,0,0.6)]">
          <iframe src="/godot/index.html" title="Godot" className="w-full h-full" />
        </div>
      )}
      {available === false && (
        <div className="rounded-lg border border-amber-900/30 bg-black/30 p-4 text-sm text-amber-100 space-y-2">
          <p>No Godot HTML5 export found at <code>/public/godot/index.html</code>.</p>
          <ol className="list-decimal pl-6 space-y-1 text-amber-100/80">
            <li>In Godot: Project → Export → HTML5. Configure and Export.</li>
            <li>Place the exported files into <code>apps/web/public/godot/</code> (include <code>index.html</code> and .wasm/.pck files).</li>
            <li>Reload this page.</li>
          </ol>
        </div>
      )}
      {available === null && <div className="text-sm text-muted-foreground">Checking for Godot export…</div>}
    </div>
  );
}
