import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathParams } = await params;
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const root = path.join(repoRoot, 'packages', 'assets', 'ui');
    const rel = pathParams.join('/');
    const abs = path.join(root, rel);
    if (!abs.startsWith(root)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    try {
        const stat = fs.statSync(abs);
        if (!stat.isFile()) throw new Error('not_file');
        const stream = fs.createReadStream(abs);
        const ext = path.extname(abs).toLowerCase();
        const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
        return new NextResponse(stream as unknown as ReadableStream, { headers: new Headers({ 'content-type': type, 'cache-control': 'public, max-age=3600' }) });
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}


