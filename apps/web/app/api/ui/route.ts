import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

function list(dir: string, base = ''): string[] {
    const out: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) out.push(...list(path.join(dir, e.name), path.join(base, e.name)));
        else out.push(path.join(base, e.name));
    }
    return out;
}

export async function GET() {
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const root = path.join(repoRoot, 'packages', 'assets', 'ui');
    try {
        const files = fs.existsSync(root) ? list(root) : [];
        return NextResponse.json({ files });
    } catch {
        return NextResponse.json({ files: [] });
    }
}


