import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join('/');
  const assetsPath = path.join(process.cwd(), '../../packages/assets/ui/themes/pixel-pack', filePath);

  try {
    const stat = fs.statSync(assetsPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }

    const stream = fs.createReadStream(assetsPath);
    const contentType = filePath.endsWith('.png') ? 'image/png' :
      filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' :
        'application/octet-stream';

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}