import { NextResponse } from 'next/server';
import { loadDeckManifest } from '@/lib/cardAssets';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: Request,
    { params }: { params: { deck: string } }
) {
    const deckId = params.deck;
    const manifest = loadDeckManifest(deckId);
    if (!manifest) {
        return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
    }
    return NextResponse.json(manifest);
}


