import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const soundsRoot = path.join(repoRoot, 'packages', 'assets', 'sounds');
    const safeRel = params.path.join('/');
    const abs = path.join(soundsRoot, safeRel);
    if (!abs.startsWith(soundsRoot)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    try {
        const stat = fs.statSync(abs);
        if (!stat.isFile()) throw new Error('Not a file');
        const stream = fs.createReadStream(abs);
        const ext = path.extname(abs).toLowerCase();
        const type = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';
        return new NextResponse(stream as unknown as ReadableStream, {
            headers: new Headers({ 'content-type': type, 'cache-control': 'public, max-age=3600' }),
        });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}


