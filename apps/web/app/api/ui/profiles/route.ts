import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const themePath = path.join(repoRoot, 'packages', 'assets', 'ui', 'themes', 'pixel-pack', 'theme.json');
  try {
    const theme = JSON.parse(fs.readFileSync(themePath, 'utf8')) as any;
    const profiles = {
      // Enemy profile sheets (single files listing)
      enemies: theme.atlases?.profiles?.files ?? [],
      // Character profiles (a single atlas file)
      characters: theme.atlases?.characterProfiles?.file ?? null,
    };
    return NextResponse.json(profiles);
  } catch {
    return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
  }
}
