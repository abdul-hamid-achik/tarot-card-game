/*
  Copies and normalizes card images from source deck folders into
  packages/assets canonical structure and rewrites manifests.
*/
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const majorSlugsByOrdinal = [
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

const rankSlugByNumber = {
    '01': 'ace', '02': 'two', '03': 'three', '04': 'four', '05': 'five',
    '06': 'six', '07': 'seven', '08': 'eight', '09': 'nine', '10': 'ten',
};
const numberByRankSlug = Object.fromEntries(Object.entries(rankSlugByNumber).map(([n, r]) => [r, n]));

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function writeJSON(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

function migrateClassic() {
    const srcDir = path.join(repoRoot, 'decks', 'B');
    const destBase = path.join(repoRoot, 'packages', 'assets', 'decks-classic');
    const destCards = path.join(destBase, 'cards');
    ensureDir(destCards);
    const manifest = {
        deckId: 'classic',
        displayName: 'Classic Tarot (flat export)',
        defaultScale: '2x',
        credits: { license: 'Originally in decks/B' },
        back: {},
        cards: [],
    };

    const files = fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.png'));
    for (const file of files) {
        const mMajor = file.match(/^(\d+)_([a-z_]+)\.png$/i);
        const mMinor = file.match(/^([a-z]+)_of_(wands|cups|swords|pentacles)\.png$/i);
        let id = null;
        let slug = null;
        if (mMajor) {
            const n = String(mMajor[1]).padStart(2, '0');
            slug = mMajor[2].toLowerCase();
            id = `major_${n}`;
        } else if (mMinor) {
            const rank = mMinor[1].toLowerCase();
            const suit = mMinor[2].toLowerCase();
            if (numberByRankSlug[rank]) {
                id = `${suit}_${numberByRankSlug[rank]}`;
            } else if (['page', 'knight', 'queen', 'king'].includes(rank)) {
                id = `${suit}_${rank}`;
            }
            slug = `${rank}_of_${suit}`;
        }
        if (!id) continue;
        const src = path.join(srcDir, file);
        const dest = path.join(destCards, id, '2x.png');
        copyFile(src, dest);
        manifest.cards.push({ id, slug, images: { '2x': `cards/${id}/2x.png` } });
    }
    // Sort manifest cards by id for consistency
    manifest.cards.sort((a, b) => a.id.localeCompare(b.id));
    writeJSON(path.join(destBase, 'deck.json'), manifest);
}

function toSnakeCaseSlug(s) {
    return s
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}

function migrateMarigold() {
    const srcCards = path.join(repoRoot, 'decks', 'C', 'cards');
    const destBase = path.join(repoRoot, 'packages', 'assets', 'decks-marigold');
    const destCards = path.join(destBase, 'cards');
    const destBack = path.join(destBase, 'back');
    ensureDir(destCards);
    ensureDir(destBack);

    const manifest = {
        deckId: 'marigold',
        displayName: 'Marigold Majors',
        defaultScale: '2x',
        credits: {
            artist: 'Zune',
            contact: { instagram: '@stars.in.a.box', twitter: '@stars_in_a_box', itch: 'stars-in-a-box.itch.io' },
            license: 'Credit the artist; no redistribution or AI/NFT usage (see decks/C/_readme.txt)'
        },
        back: {},
        cards: [],
    };

    // Copy back image if available
    try {
        const backFolder = path.join(srcCards, '_cardBack');
        const candidates = ['_cardBack_2x.png', '_cardBack_1x.png', '_cardBack_5x.png'];
        for (const f of candidates) {
            const p = path.join(backFolder, f);
            if (fs.existsSync(p)) {
                copyFile(p, path.join(destBack, '2x.png'));
                manifest.back['2x'] = 'back/2x.png';
                break;
            }
        }
    } catch { }

    const entries = fs.readdirSync(srcCards, { withFileTypes: true });
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith('_')) continue;
        const folder = e.name; // e.g., 10_wheelOfFortune
        const parts = folder.split('_');
        if (parts.length < 2) continue;
        const slugPart = parts.slice(1).join('_');
        const slug = toSnakeCaseSlug(slugPart);
        const ordinal = majorSlugsByOrdinal.indexOf(slug);
        if (ordinal < 0) continue; // not a recognized major
        const id = `major_${String(ordinal).padStart(2, '0')}`;
        const folderAbs = path.join(srcCards, folder);
        const baseName = folder;
        const candidates = [
            `${baseName}_2x.png`,
            `${baseName}_1x.png`,
            `${baseName}_5x.png`,
            `${baseName}.png`,
        ];
        let chosen = null;
        for (const f of candidates) {
            const p = path.join(folderAbs, f);
            if (fs.existsSync(p)) { chosen = p; break; }
        }
        if (!chosen) continue;
        const dest = path.join(destCards, id, '2x.png');
        copyFile(chosen, dest);
        manifest.cards.push({ id, slug, images: { '2x': `cards/${id}/2x.png` } });
    }

    manifest.cards.sort((a, b) => a.id.localeCompare(b.id));
    writeJSON(path.join(destBase, 'deck.json'), manifest);
}

function migrateArcanaA() {
    const srcMajor = path.join(repoRoot, 'decks', 'A', 'Major Arcana');
    const destBase = path.join(repoRoot, 'packages', 'assets', 'decks-arcana-a');
    const destCards = path.join(destBase, 'cards');
    const destBack = path.join(destBase, 'back');
    ensureDir(destCards);
    ensureDir(destBack);

    const manifest = {
        deckId: 'arcana-a',
        displayName: 'Arcana Set A (Majors)',
        defaultScale: '2x',
        credits: {},
        back: {},
        cards: [],
    };

    // Back image
    try {
        const backPng = path.join(srcMajor, 'Back', 'Back.png');
        if (fs.existsSync(backPng)) {
            copyFile(backPng, path.join(destBack, '2x.png'));
            manifest.back['2x'] = 'back/2x.png';
        }
    } catch { }

    const folderToSlug = new Map([
        ['The Fool', 'the_fool'],
        ['The Magician', 'the_magician'],
        ['The High Priestess', 'the_high_priestess'],
        ['The Empress', 'the_empress'],
        ['The Emperor', 'the_emperor'],
        ['The Hierophant', 'the_hierophant'],
        ['The Lovers', 'the_lovers'],
        ['The Chariot', 'the_chariot'],
        ['Strength', 'strength'],
        ['The Hermit', 'the_hermit'],
        ['Wheel of Fortune', 'wheel_of_fortune'],
        ['Justice', 'justice'],
        ['The Hanged Man', 'the_hanged_man'],
        ['Death', 'death'],
        ['Temperance', 'temperance'],
        ['The Devil', 'the_devil'],
        ['The Tower', 'the_tower'],
        ['The Star', 'the_star'],
        ['The Moon', 'the_moon'],
        ['The Sun', 'the_sun'],
        ['Judgement', 'judgement'],
        ['The World', 'the_world'],
    ]);

    for (const [folderName, slug] of folderToSlug) {
        const ordinal = majorSlugsByOrdinal.indexOf(slug);
        if (ordinal < 0) continue;
        const id = `major_${String(ordinal).padStart(2, '0')}`;
        const png = path.join(srcMajor, folderName, `${ordinal + 1}.png`);
        // Some folders use plain numbers that match RW index+1; otherwise try any .png in the folder
        let chosen = null;
        if (fs.existsSync(png)) chosen = png;
        if (!chosen) {
            const all = fs.readdirSync(path.join(srcMajor, folderName)).filter(f => f.toLowerCase().endsWith('.png'));
            if (all.length > 0) chosen = path.join(srcMajor, folderName, all[0]);
        }
        if (!chosen) continue;
        const dest = path.join(destCards, id, '2x.png');
        copyFile(chosen, dest);
        manifest.cards.push({ id, slug, images: { '2x': `cards/${id}/2x.png` } });
    }

    manifest.cards.sort((a, b) => a.id.localeCompare(b.id));
    writeJSON(path.join(destBase, 'deck.json'), manifest);
}

function migrateDeckDVariant(variant) {
    const srcBase = path.join(repoRoot, 'decks', 'D', variant);
    const deckId = variant === 'color' ? 'duality-color' : 'duality-mono';
    const display = variant === 'color' ? 'Duality (Color)' : 'Duality (Monochrome)';
    const destBase = path.join(repoRoot, 'packages', 'assets', `decks-${deckId}`);
    const destCards = path.join(destBase, 'cards');
    const destBack = path.join(destBase, 'back');
    ensureDir(destCards);
    ensureDir(destBack);

    const manifest = {
        deckId,
        displayName: display,
        defaultScale: '2x',
        credits: {},
        back: {},
        cards: [],
    };

    // Back
    const backSrc = path.join(srcBase, 'back.png');
    if (fs.existsSync(backSrc)) {
        copyFile(backSrc, path.join(destBack, '2x.png'));
        manifest.back['2x'] = 'back/2x.png';
    }

    // Majors 00..21
    for (let i = 0; i <= 21; i++) {
        const n = String(i).padStart(2, '0');
        const src = path.join(srcBase, `${n}.png`);
        if (!fs.existsSync(src)) continue;
        const slug = majorSlugsByOrdinal[i];
        const id = `major_${n}`;
        const dest = path.join(destCards, id, '2x.png');
        copyFile(src, dest);
        manifest.cards.push({ id, slug, images: { '2x': `cards/${id}/2x.png` } });
    }

    manifest.cards.sort((a, b) => a.id.localeCompare(b.id));
    writeJSON(path.join(destBase, 'deck.json'), manifest);
}

function migrateDeckD() {
    migrateDeckDVariant('color');
    migrateDeckDVariant('monochrome');
}

function main() {
    migrateClassic();
    migrateMarigold();
    migrateArcanaA();
    migrateDeckD();
    console.log('Migration complete.');
}

main();


