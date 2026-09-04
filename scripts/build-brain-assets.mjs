/**
 * Builds the gold Mind Power brain from the original grey render.
 *
 *   node scripts/build-brain-assets.mjs [--out <dir>]
 *
 * The paper brain in the product is a low-poly render supplied as a grey PNG
 * (`image 745.png`, 5723×4292). The green brain.webp was made from it once
 * with a luminance→green ramp; this script makes the gold pair the same way
 * — the same grey render, the same silhouette (the alpha is lifted straight
 * from brain.webp so the two line up pixel for pixel), and a ramp from deep
 * bronze through the brand gold to a warm highlight, so the model reads as
 * a metal casting of the same object rather than a yellow tint over it.
 *
 * Writes brain-gold.webp (1600×1200) and brain-gold-sm.webp (480×360) into
 * public/assets/mind-power, or into --out for a look before committing.
 */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSETS = path.join(ROOT, 'public', 'assets', 'mind-power');
const GREY_SRC = process.env.BRAIN_GREY_SRC || path.join(os.homedir(), 'Downloads', 'image 745.png');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : ASSETS;

const W = 1600;
const H = 1200;
const SMALL_W = 480;

/**
 * The gold ramp, as luminance stops. Most of the lit paper lands in the
 * upper midtones, so that is where the saturated gold sits — a step brighter
 * and warmer than the brand gold (#C5A059), which on its own reads as sand
 * against the dark page. Below it the ramp goes to amber and bronze rather
 * than brown-grey; above it to a cream highlight so the facets that catch
 * the light actually shine.
 */
const GOLD_STOPS = [
    [0.0, [0x3a, 0x25, 0x06]],
    [0.2, [0x7f, 0x55, 0x0e]],
    [0.4, [0xbb, 0x88, 0x24]],
    [0.58, [0xdc, 0xae, 0x3c]], // the gold itself
    [0.78, [0xf1, 0xd0, 0x66]],
    [1.0, [0xff, 0xf1, 0xae]],
];

function ramp(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
        const [x1, c1] = stops[i];
        if (x <= x1) {
            const [x0, c0] = stops[i - 1];
            const f = (x - x0) / (x1 - x0);
            return [0, 1, 2].map(k => Math.round(c0[k] + (c1[k] - c0[k]) * f));
        }
    }
    return stops[stops.length - 1][1];
}

/** A little extra contrast in the luminance before it meets the ramp: metal has crisper facets than paper. */
function shape(l) {
    const c = Math.min(1, Math.max(0, (l - 0.06) / 0.9));
    return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

async function build() {
    if (!fs.existsSync(GREY_SRC)) {
        throw new Error(`Grey render not found at ${GREY_SRC} — set BRAIN_GREY_SRC.`);
    }
    fs.mkdirSync(OUT, { recursive: true });

    // Luminance from the render; silhouette from the shipped green brain.
    const grey = await sharp(GREY_SRC)
        .resize(W, H, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .greyscale()
        .raw()
        .toBuffer();
    const alpha = await sharp(path.join(ASSETS, 'brain.webp'))
        .ensureAlpha()
        .extractChannel('alpha')
        .raw()
        .toBuffer();

    const lut = Array.from({ length: 256 }, (_, v) => ramp(GOLD_STOPS, shape(v / 255)));
    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
        const [r, g, b] = lut[grey[i]];
        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
        rgba[i * 4 + 3] = alpha[i];
    }

    const full = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
    await writeAtomic(full.clone().webp({ quality: 90, alphaQuality: 90 }), path.join(OUT, 'brain-gold.webp'));
    await writeAtomic(
        full.clone().resize(SMALL_W, (SMALL_W * H) / W, { kernel: sharp.kernel.lanczos3 }).webp({ quality: 88, alphaQuality: 90 }),
        path.join(OUT, 'brain-gold-sm.webp'),
    );
    console.log(`wrote brain-gold.webp and brain-gold-sm.webp to ${OUT}`);
}

/** Write next to the target then rename: sharp cannot overwrite a file it has open on Windows. */
async function writeAtomic(pipeline, target) {
    const tmp = `${target}.tmp`;
    await pipeline.toFile(tmp);
    fs.renameSync(tmp, target);
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
