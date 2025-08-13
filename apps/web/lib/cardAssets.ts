import path from 'node:path';
import fs from 'node:fs';

export type Scale = '1x' | '2x' | '5x';

const majorSlugsByOrdinal: string[] = [
    'the_fool',
    'the_magician',
    'the_high_priestess',
    'the_empress',
    'the_emperor',
    'the_hierophant',
    'the_lovers',
    'the_chariot',
    'strength',
    'the_hermit',
    'wheel_of_fortune',
    'justice',
    'the_hanged_man',
    'death',
    'temperance',
    'the_devil',
    'the_tower',
    'the_star',
    'the_moon',
    'the_sun',
    'judgement',
    'the_world',
];

const rankSlugByNumber: Record<string, string> = {
    '01': 'ace',
    '02': 'two',
    '03': 'three',
    '04': 'four',
    '05': 'five',
    '06': 'six',
    '07': 'seven',
    '08': 'eight',
    '09': 'nine',
    '10': 'ten',
};

function isMinor(cardId: string): boolean {
    return /(wands|cups|swords|pentacles)_/.test(cardId);
}

function parseMinor(cardId: string): { suit: string; rank: string } | null {
    const m = cardId.match(/^(wands|cups|swords|pentacles)_(\d{2}|page|knight|queen|king)$/);
    if (!m) return null;
    return { suit: m[1], rank: m[2] };
}

function parseMajor(cardId: string): number | null {
    const m = cardId.match(/^major_(\d{2})$/);
    if (!m) return null;
    const ordinal = Number(m[1]);
    if (Number.isNaN(ordinal) || ordinal < 0 || ordinal >= majorSlugsByOrdinal.length) return null;
    return ordinal;
}

export function resolveDeckBRelativeFile(cardId: string): string | null {
    if (isMinor(cardId)) {
        const minor = parseMinor(cardId);
        if (!minor) return null;
        const { suit, rank } = minor;
        const rankSlug = rankSlugByNumber[rank] ?? rank; // keep court ranks as-is
        return `${rankSlug}_of_${suit}.png`;
    }
    const ordinal = parseMajor(cardId);
    if (ordinal !== null) {
        const slug = majorSlugsByOrdinal[ordinal];
        return `${ordinal}_${slug}.png`;
    }
    return null;
}

export function getRepoRootFromWebAppCwd(cwd: string): string {
    // apps/web -> repo root is two levels up
    return path.resolve(cwd, '..', '..');
}

export function resolveAbsoluteImagePathForDeckB(cardId: string): string | null {
    const rel = resolveDeckBRelativeFile(cardId);
    if (!rel) return null;
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    return path.join(repoRoot, 'decks', 'B', rel);
}

export interface DeckManifestCardEntry {
    id: string;
    slug: string;
    images?: Partial<Record<Scale, string>>;
    source?: string;
}

export interface DeckManifest {
    deckId: string;
    displayName?: string;
    defaultScale?: Scale;
    back?: Partial<Record<Scale, string>>;
    cards: DeckManifestCardEntry[];
    storage?: { kind: 'linked'; source: string };
    credits?: {
        artist?: string;
        contact?: { instagram?: string; twitter?: string; itch?: string };
        license?: string;
    };
}

export function loadDeckManifest(deckId: string): DeckManifest | null {
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    const manifestPath = path.join(repoRoot, 'packages', 'assets', `decks-${deckId}`, 'deck.json');
    try {
        const text = fs.readFileSync(manifestPath, 'utf8');
        return JSON.parse(text) as DeckManifest;
    } catch {
        return null;
    }
}

function getDeckManifestBaseDir(deckId: string): string {
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    return path.join(repoRoot, 'packages', 'assets', `decks-${deckId}`);
}

export function resolveAbsoluteImagePathFromManifest(
    deckId: string,
    cardId: string,
    preferredScale: Scale = '2x'
): string | null {
    const manifest = loadDeckManifest(deckId);
    if (!manifest) return null;
    const entry = manifest.cards.find((c) => c.id === cardId);
    if (!entry || !entry.images) return null;
    const scales: Scale[] = [preferredScale, '2x', '1x', '5x'];
    for (const sc of scales) {
        const rel = entry.images[sc];
        if (rel) {
            const base = getDeckManifestBaseDir(deckId);
            return path.join(base, rel);
        }
    }
    return null;
}

function toSnakeCaseSlug(s: string): string {
    // Replace camelCase boundaries with underscore, spaces/dashes to underscore, lowercase
    return s
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}

function getDeckCBaseDir(): string {
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    return path.join(repoRoot, 'decks', 'C', 'cards');
}

function findDeckCFolderForMajorSlug(slug: string): string | null {
    const base = getDeckCBaseDir();
    try {
        const entries = fs.readdirSync(base, { withFileTypes: true });
        for (const e of entries) {
            if (!e.isDirectory()) continue;
            const name = e.name; // e.g., 0_theFool, 8_justice
            const parts = name.split('_');
            if (parts.length < 2) continue;
            const slugPart = parts.slice(1).join('_');
            const normalized = toSnakeCaseSlug(slugPart);
            if (normalized === slug) return path.join(base, name);
        }
    } catch {
        return null;
    }
    return null;
}

export function resolveAbsoluteImagePathForDeckMarigold(cardId: string, preferredScale: Scale = '2x'): string | null {
    const ordinal = parseMajor(cardId);
    if (ordinal === null) return null; // majors only for Deck C
    const targetSlug = majorSlugsByOrdinal[ordinal];
    const folder = findDeckCFolderForMajorSlug(targetSlug);
    if (!folder) return null;
    // Prefer <folder>_<scale>.png in order: preferred, 2x, 1x, 5x, plain .png
    const baseName = path.basename(folder);
    const candidates: string[] = [];
    const scales: Scale[] = [preferredScale, '2x', '1x', '5x'];
    for (const sc of scales) candidates.push(path.join(folder, `${baseName}_${sc}.png`));
    candidates.push(path.join(folder, `${baseName}.png`));
    for (const abs of candidates) {
        try {
            const st = fs.statSync(abs);
            if (st.isFile()) return abs;
        } catch {
            // continue
        }
    }
    return null;
}



