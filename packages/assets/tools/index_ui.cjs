/*
  Scans packages/assets/ui and writes a manifest (ui.json) classifying assets
  into backgrounds and spritesheets. Screenshots are ignored.
*/
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const uiRoot = path.join(repoRoot, 'packages', 'assets', 'ui');

function list(dir) {
    const entries = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) entries.push(...list(p));
        else entries.push(p);
    }
    return entries;
}

function rel(p) {
    return path.relative(uiRoot, p).split(path.sep).join('/');
}

function main() {
    if (!fs.existsSync(uiRoot)) {
        console.error('ui root missing:', uiRoot);
        process.exit(0);
    }
    const files = list(uiRoot).filter((p) => /\.(png|jpg|jpeg)$/i.test(p));
    const backgrounds = [];
    const spritesheets = [];
    for (const f of files) {
        const r = rel(f);
        if (/^Screenshots\//i.test(r)) continue;
        if (/TableBackground/i.test(r)) {
            backgrounds.push(r);
        } else if (/CardGameUI/i.test(r)) {
            spritesheets.push(r);
        }
    }
    const manifest = {
        generatedAt: new Date().toISOString(),
        backgrounds: backgrounds.sort(),
        spritesheets: spritesheets.sort(),
    };
    fs.writeFileSync(path.join(uiRoot, 'ui.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('Wrote UI manifest with', backgrounds.length, 'backgrounds and', spritesheets.length, 'spritesheets');
}

main();


