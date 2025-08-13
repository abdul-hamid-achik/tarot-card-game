/*
  Reorganize UI assets into a canonical theme structure and generate theme.json.
  Input (current): packages/assets/ui/Sprites/*.png
  Output: packages/assets/ui/themes/pixel-pack/{backgrounds, sheets}/...
*/
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const uiRoot = path.join(repoRoot, 'packages', 'assets', 'ui');
const srcSprites = path.join(uiRoot, 'Sprites');
const srcReadme = path.join(uiRoot, 'ReadMe.txt');
const themeId = 'pixel-pack';
const themeRoot = path.join(uiRoot, 'themes', themeId);
const outBackgrounds = path.join(themeRoot, 'backgrounds');
const outSheets = path.join(themeRoot, 'sheets');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function copyFile(src, dest) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); }

function zero2(n) { return String(n).padStart(2, '0'); }

function main() {
    if (!fs.existsSync(srcSprites)) {
        console.error('No Sprites folder found at', srcSprites);
        process.exit(0);
    }
    ensureDir(outBackgrounds);
    ensureDir(outSheets);

    const backgrounds = [];
    const sheets = [];

    const files = fs.readdirSync(srcSprites).filter((f) => /\.(png)$/i.test(f));
    // Normalize: TableBackground*.png -> table_bg_XX.png
    let bgIndex = 1;
    for (const f of files) {
        if (/^TableBackground\d*\.png$/i.test(f)) {
            const destName = `table_bg_${zero2(bgIndex)}.png`;
            copyFile(path.join(srcSprites, f), path.join(outBackgrounds, destName));
            backgrounds.push(`backgrounds/${destName}`);
            bgIndex++;
        }
    }

    // Normalize: CardGameUI*.png -> card_ui_XX.png (sequence sorted by natural order)
    const sheetFiles = files.filter((f) => /^CardGameUI\d*\.png$/i.test(f));
    sheetFiles.sort((a, b) => {
        const na = Number((a.match(/(\d+)/) || [, '0'])[1]);
        const nb = Number((b.match(/(\d+)/) || [, '0'])[1]);
        return na - nb;
    });
    let sheetIndex = 1;
    for (const f of sheetFiles) {
        const destName = `card_ui_${zero2(sheetIndex)}.png`;
        copyFile(path.join(srcSprites, f), path.join(outSheets, destName));
        sheets.push({ id: `card_ui_${zero2(sheetIndex)}`, file: `sheets/${destName}` });
        sheetIndex++;
    }

    // Copy ReadMe if present
    if (fs.existsSync(srcReadme)) {
        copyFile(srcReadme, path.join(themeRoot, 'README.txt'));
    }

    const theme = {
        themeId,
        displayName: 'Pixel Pack',
        backgrounds,
        sheets,
        defaultBackground: backgrounds[0] || null,
        defaultSheet: sheets[0]?.id || null,
    };
    fs.writeFileSync(path.join(themeRoot, 'theme.json'), JSON.stringify(theme, null, 2) + '\n', 'utf8');
    console.log('UI theme created at', path.relative(uiRoot, themeRoot));
}

main();


