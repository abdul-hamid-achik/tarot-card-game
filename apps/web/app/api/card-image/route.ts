import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { resolveAbsoluteImagePathForDeckB, resolveAbsoluteImagePathForDeckMarigold, loadDeckManifest, resolveAbsoluteImagePathFromManifest } from '@/lib/cardAssets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const deck = searchParams.get('deck') ?? 'classic';

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Deck demo uses manifest indirection; currently links to decks/B flat files.
    let abs: string | null = null;
    // Try manifest-first for any deck id
    const manifest = loadDeckManifest(deck);
    if (manifest) {
        abs = resolveAbsoluteImagePathFromManifest(deck, id);
    }
    // Fallbacks for known legacy mappers if manifest did not resolve
    if (!abs) {
        if (deck === 'classic') {
            abs = resolveAbsoluteImagePathForDeckB(id);
        } else if (deck === 'marigold') {
            abs = resolveAbsoluteImagePathForDeckMarigold(id);
        }
    }
    if (!manifest && deck && deck !== 'classic' && deck !== 'marigold') {
        return NextResponse.json({ error: 'Unknown deck' }, { status: 404 });
    }
    if (!abs) {
        return NextResponse.json({ error: 'Unknown card id' }, { status: 400 });
    }
    try {
        const stat = fs.statSync(abs);
        if (!stat.isFile()) throw new Error('Not a file');
        const stream = fs.createReadStream(abs);
        return new NextResponse(stream as unknown as ReadableStream, {
            headers: new Headers({ 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' }),
        });
    } catch (err) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}


