import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const themePath = path.join(repoRoot, 'packages', 'assets', 'ui', 'themes', 'pixel-pack', 'theme.json');
    try {
        const text = fs.readFileSync(themePath, 'utf8');
        return NextResponse.json(JSON.parse(text));
    } catch {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
}


