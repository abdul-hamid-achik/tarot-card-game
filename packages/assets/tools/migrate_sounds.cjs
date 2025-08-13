/*
  Normalize and copy sound assets from 'Magical Card Game Sounds' into
  packages/assets/sounds/effects with standard snake_case names.
*/
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const srcDir = path.join(repoRoot, 'packages', 'assets', 'sounds', 'Magical Card Game Sounds');
const destBase = path.join(repoRoot, 'packages', 'assets', 'sounds', 'effects');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function copyFile(src, dest) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); }

const PATTERNS = [
    { re: /^Magic Card Deal (\d+)\.wav$/i, to: (n) => `card_deal_${n}.wav` },
    { re: /^Magic Card Discard (\d+)\.wav$/i, to: (n) => `card_discard_${n}.wav` },
    { re: /^Magic Card Draw (\d+)\.wav$/i, to: (n) => `card_draw_${n}.wav` },
    { re: /^Magic Card Flip (\d+)\.wav$/i, to: (n) => `card_flip_${n}.wav` },
    { re: /^Magic Card Placing (\d+)\.wav$/i, to: (n) => `card_place_${n}.wav` },
    { re: /^Magic Card Shuffle (\d+)\.wav$/i, to: (n) => `card_shuffle_${n}.wav` },
    { re: /^Magic Card Slide (\d+)\.wav$/i, to: (n) => `card_slide_${n}.wav` },
    { re: /^Change Of Turns (\d+)\.wav$/i, to: (n) => `turn_change_${n}.wav` },
    { re: /^Pass Of Turn (\d+)\.wav$/i, to: (n) => `turn_pass_${n}.wav` },
    { re: /^Special Card Reveal (\d+)\.wav$/i, to: (n) => `card_reveal_${n}.wav` },
    { re: /^Magic Coin Fall (\d+)\.wav$/i, to: (n) => `coin_fall_${n}.wav` },
    { re: /^Magic Coin Flip (\d+)\.wav$/i, to: (n) => `coin_flip_${n}.wav` },
    { re: /^Magic Dice Roll (\d+)\.wav$/i, to: (n) => `dice_roll_${n}.wav` },
];

function pad2(numStr) { return String(numStr).padStart(2, '0'); }

function migrate() {
    if (!fs.existsSync(srcDir)) {
        console.error('Source sounds folder not found:', srcDir);
        process.exit(0);
    }
    ensureDir(destBase);
    const files = fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.wav'));
    const index = [];
    for (const file of files) {
        let matched = false;
        for (const p of PATTERNS) {
            const m = file.match(p.re);
            if (!m) continue;
            const n = pad2(m[1]);
            const destName = p.to(n);
            const src = path.join(srcDir, file);
            const dest = path.join(destBase, destName);
            copyFile(src, dest);
            index.push(destName);
            matched = true;
            break;
        }
        if (!matched) {
            // fall back: generic slug
            const base = file.replace(/\.wav$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const src = path.join(srcDir, file);
            const dest = path.join(destBase, `${base}.wav`);
            copyFile(src, dest);
            index.push(`${base}.wav`);
        }
    }
    // write index.json for quick lookup
    const meta = {
        basePath: 'effects/',
        files: index.sort(),
        categories: {
            card: index.filter((f) => f.startsWith('card_')),
            coin: index.filter((f) => f.startsWith('coin_')),
            dice: index.filter((f) => f.startsWith('dice_')),
            turn: index.filter((f) => f.startsWith('turn_')),
        },
    };
    fs.writeFileSync(path.join(destBase, 'index.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
    console.log('Migrated', index.length, 'sound files to', destBase);
}

migrate();


