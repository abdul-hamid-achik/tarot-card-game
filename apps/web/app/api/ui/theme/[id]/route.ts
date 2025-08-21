import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const themePath = path.join(repoRoot, 'packages', 'assets', 'ui', 'themes', id, 'theme.json');
    try {
        const text = fs.readFileSync(themePath, 'utf8');
        return NextResponse.json(JSON.parse(text));
    } catch {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
}


