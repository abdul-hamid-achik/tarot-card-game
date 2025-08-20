import path from 'node:path';
import fs from 'node:fs';
import { gameLogger } from '@tarot/game-logger';

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
    gameLogger.logAction('asset_resolve_deck_b_start', {
        cardId,
        isMinor: isMinor(cardId),
        isMajor: parseMajor(cardId) !== null
    }, true, 'Starting Deck B asset resolution');

    if (isMinor(cardId)) {
        const minor = parseMinor(cardId);
        if (!minor) {
            gameLogger.logAction('asset_resolve_deck_b_failed', {
                cardId,
                reason: 'invalid_minor_format'
            }, false, 'Failed to parse minor card format');
            return null;
        }
        const { suit, rank } = minor;
        const rankSlug = rankSlugByNumber[rank] ?? rank; // keep court ranks as-is
        const result = `${rankSlug}_of_${suit}.png`;
        gameLogger.logAction('asset_resolve_deck_b_success', {
            cardId,
            suit,
            rank,
            rankSlug,
            result
        }, true, 'Successfully resolved Deck B minor card asset');
        return result;
    }
    const ordinal = parseMajor(cardId);
    if (ordinal !== null) {
        const slug = majorSlugsByOrdinal[ordinal];
        const result = `${ordinal}_${slug}.png`;
        gameLogger.logAction('asset_resolve_deck_b_success', {
            cardId,
            ordinal,
            slug,
            result
        }, true, 'Successfully resolved Deck B major card asset');
        return result;
    }

    gameLogger.logAction('asset_resolve_deck_b_failed', {
        cardId,
        reason: 'unrecognized_format'
    }, false, 'Failed to resolve Deck B asset - unrecognized format');
    return null;
}

export function getRepoRootFromWebAppCwd(cwd: string): string {
    // apps/web -> repo root is two levels up
    return path.resolve(cwd, '..', '..');
}

export function resolveAbsoluteImagePathForDeckB(cardId: string): string | null {
    const rel = resolveDeckBRelativeFile(cardId);
    if (!rel) {
        gameLogger.logAction('asset_resolve_deck_b_abs_failed', {
            cardId,
            reason: 'no_relative_path'
        }, false, 'Failed to get relative path for Deck B absolute resolution');
        return null;
    }
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    const absPath = path.join(repoRoot, 'decks', 'B', rel);

    gameLogger.logAction('asset_resolve_deck_b_abs_success', {
        cardId,
        relativePath: rel,
        absolutePath: absPath,
        repoRoot
    }, true, 'Successfully resolved absolute path for Deck B asset');

    return absPath;
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
    const manifestPath = path.join(repoRoot, 'packages', 'assets', 'decks', deckId, 'deck.json');

    gameLogger.logAction('asset_load_manifest_start', {
        deckId,
        manifestPath,
        repoRoot
    }, true, 'Starting deck manifest load');

    try {
        const text = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(text) as DeckManifest;

        gameLogger.logAction('asset_load_manifest_success', {
            deckId,
            cardCount: manifest.cards.length,
            displayName: manifest.displayName,
            defaultScale: manifest.defaultScale
        }, true, 'Successfully loaded deck manifest');

        return manifest;
    } catch (error) {
        gameLogger.logAction('asset_load_manifest_failed', {
            deckId,
            manifestPath,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, false, 'Failed to load deck manifest');

        return null;
    }
}

function getDeckManifestBaseDir(deckId: string): string {
    const repoRoot = getRepoRootFromWebAppCwd(process.cwd());
    return path.join(repoRoot, 'packages', 'assets', 'decks', deckId);
}

export function resolveAbsoluteImagePathFromManifest(
    deckId: string,
    cardId: string,
    preferredScale: Scale = '2x'
): string | null {
    gameLogger.logAction('asset_resolve_manifest_start', {
        deckId,
        cardId,
        preferredScale
    }, true, 'Starting manifest-based asset resolution');

    const manifest = loadDeckManifest(deckId);
    if (!manifest) {
        gameLogger.logAction('asset_resolve_manifest_failed', {
            deckId,
            cardId,
            reason: 'manifest_not_found'
        }, false, 'Failed to load manifest for asset resolution');
        return null;
    }

    const entry = manifest.cards.find((c) => c.id === cardId);
    if (!entry || !entry.images) {
        gameLogger.logAction('asset_resolve_manifest_failed', {
            deckId,
            cardId,
            reason: 'card_entry_not_found',
            entryFound: !!entry,
            hasImages: !!entry?.images
        }, false, 'Card entry not found or has no images in manifest');
        return null;
    }

    const scales: Scale[] = [preferredScale, '2x', '1x', '5x'];
    for (const sc of scales) {
        const rel = entry.images[sc];
        if (rel) {
            const base = getDeckManifestBaseDir(deckId);
            const absPath = path.join(base, rel);

            gameLogger.logAction('asset_resolve_manifest_success', {
                deckId,
                cardId,
                scale: sc,
                relativePath: rel,
                absolutePath: absPath,
                preferredScale,
                fallbackUsed: sc !== preferredScale
            }, true, 'Successfully resolved asset path from manifest');

            return absPath;
        }
    }

    gameLogger.logAction('asset_resolve_manifest_failed', {
        deckId,
        cardId,
        reason: 'no_suitable_scale_found',
        availableScales: Object.keys(entry.images)
    }, false, 'No suitable scale found in manifest images');

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
    gameLogger.logAction('asset_resolve_marigold_start', {
        cardId,
        preferredScale
    }, true, 'Starting Deck Marigold asset resolution');

    const ordinal = parseMajor(cardId);
    if (ordinal === null) {
        gameLogger.logAction('asset_resolve_marigold_failed', {
            cardId,
            reason: 'not_major_arcana'
        }, false, 'Deck Marigold only supports Major Arcana cards');
        return null; // majors only for Deck C
    }

    const targetSlug = majorSlugsByOrdinal[ordinal];
    const folder = findDeckCFolderForMajorSlug(targetSlug);
    if (!folder) {
        gameLogger.logAction('asset_resolve_marigold_failed', {
            cardId,
            ordinal,
            targetSlug,
            reason: 'folder_not_found'
        }, false, 'Could not find folder for Major Arcana slug');
        return null;
    }

    // Prefer <folder>_<scale>.png in order: preferred, 2x, 1x, 5x, plain .png
    const baseName = path.basename(folder);
    const candidates: string[] = [];
    const scales: Scale[] = [preferredScale, '2x', '1x', '5x'];
    for (const sc of scales) candidates.push(path.join(folder, `${baseName}_${sc}.png`));
    candidates.push(path.join(folder, `${baseName}.png`));

    for (const abs of candidates) {
        try {
            const st = fs.statSync(abs);
            if (st.isFile()) {
                gameLogger.logAction('asset_resolve_marigold_success', {
                    cardId,
                    ordinal,
                    targetSlug,
                    folder,
                    baseName,
                    resolvedPath: abs,
                    preferredScale,
                    usedScale: abs.includes('_') ? abs.split('_').pop()?.replace('.png', '') : 'default'
                }, true, 'Successfully resolved Deck Marigold asset path');
                return abs;
            }
        } catch {
            // continue
        }
    }

    gameLogger.logAction('asset_resolve_marigold_failed', {
        cardId,
        ordinal,
        targetSlug,
        folder,
        candidates,
        reason: 'no_file_found'
    }, false, 'No suitable image file found for Deck Marigold asset');

    return null;
}



