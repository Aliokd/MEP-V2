/**
 * PNG companions for the brand SVGs, for the guidelines page's download pair.
 *
 * The page offers each mark as SVG and as PNG, and only the vectors were ever
 * committed — the buttons said "SVG / PNG" while linking at one file. Rather
 * than keep hand-exported bitmaps in sync with artwork that changes, they are
 * rendered from the SVGs themselves, so a PNG can never drift from the vector
 * it is supposed to be a copy of.
 *
 *   node scripts/build-brand-rasters.mjs
 *
 * Re-run after editing anything in public/assets/brand/.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = join(process.cwd(), 'public', 'assets', 'brand');

/*
 * Wide enough to place in a deck or a press page without softening. Height
 * follows the artwork's own ratio; a transparent ground keeps each mark usable
 * on whatever it lands on, which is the whole point of offering the white one.
 */
const WIDTH = 1600;

const MARKS = [
    'veinote-wordmark-ink',
    'veinote-wordmark-white',
    'veinote-logo-serif',
];

for (const name of MARKS) {
    const svg = await readFile(join(DIR, `${name}.svg`));
    const out = join(DIR, `${name}.png`);
    await sharp(svg, { density: 600 })
        .resize({ width: WIDTH, withoutEnlargement: false })
        .png({ compressionLevel: 9 })
        .toFile(out);
    const { width, height } = await sharp(out).metadata();
    console.log(`${name}.png  ${width}×${height}`);
}
