import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const themesDir = path.join(repoRoot, 'packages', 'assets', 'ui', 'themes');
    try {
        const entries = fs.readdirSync(themesDir, { withFileTypes: true }).filter((e) => e.isDirectory());
        const themes = entries.map((e) => e.name);
        return NextResponse.json({ themes });
    } catch {
        return NextResponse.json({ themes: [] });
    }
}


