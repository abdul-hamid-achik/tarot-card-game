import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const idxPath = path.join(repoRoot, 'packages', 'assets', 'sounds', 'effects', 'index.json');
    try {
        const text = fs.readFileSync(idxPath, 'utf8');
        const json = JSON.parse(text);
        return NextResponse.json(json);
    } catch {
        return NextResponse.json({ basePath: 'effects/', files: [], categories: {} });
    }
}


