/**
 * Captures the Golden program page's visuals as the images the golden ticket
 * email shows (lib/email/templates/goldenTicket.ts).
 *
 * Email can carry none of what draws them on the page: Gmail and Outlook strip
 * SVG, run no script and play no animation, so the showcase demos, the golden
 * mind, the benefit icons and the globe reach an inbox only as pictures. This
 * takes those pictures from the page itself, so the email shows exactly what
 * the page does and a change to the page is one re-run away from the email.
 *
 * Run against a dev server on the page's current code:
 *
 *   node scripts/capture-golden-email-assets.mjs [baseUrl]
 *
 * baseUrl defaults to http://localhost:3000. Writes to
 * public/assets/email/golden/, which is served from veinote.com once deployed.
 * The email points at the production host, so a re-capture shows in inboxes
 * only after the deploy that ships it.
 *
 * Photographs go out as JPEG, flattened onto white, the email card's own
 * ground, so the rounded corners that were transparent on the page do not
 * come out black. The icons and the seal, flat colour with edges, go out as
 * PNG with their transparency, since they sit on more than one ground.
 *
 * After re-capturing, bump ASSET_VERSION in lib/email/templates/goldenTicket.ts:
 * the pictures are cached for a week under their address, by browsers and by
 * Gmail's image proxy, so replaced files otherwise keep showing the old ones.
 */

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), "public", "assets", "email", "golden");
// The email's content column is 440px (a 520px card with 40px padding), and
// everything is drawn at twice that for high-density screens.
const COLUMN = 880;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function save(buffer, name, { width = COLUMN, format = "jpeg" } = {}) {
    // A JPEG has no transparency, so its corners are flattened onto white.
    // A PNG keeps them clear: the icons sit on tinted cards and on a white one,
    // and a white square behind a rounded tile shows on the tinted ones.
    let img = sharp(buffer).resize({ width, withoutEnlargement: true });
    img = format === "png" ? img.png({ compressionLevel: 9 }) : img.flatten({ background: "#FFFFFF" }).jpeg({ quality: 82, mozjpeg: true });
    const file = path.join(OUT, `${name}.${format === "png" ? "png" : "jpg"}`);
    const info = await img.toFile(file);
    console.log(`${name}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
}

/**
 * Answers the cookie banner the least-permissive way, so it is not in every
 * picture. Local and headless, so nothing is measured either way.
 */
async function dismissConsent(page) {
    const necessary = page.getByRole("button", { name: "Only necessary" });
    if (await necessary.isVisible({ timeout: 5000 }).catch(() => false)) {
        await necessary.click();
        await sleep(600);
    }
}

/** Scrolls an element in, waits for what it draws, and returns its picture. */
async function shoot(page, locator, waitMs) {
    await locator.scrollIntoViewIfNeeded();
    await sleep(waitMs);
    return locator.screenshot({ omitBackground: true, animations: "allow" });
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

// A free ticket: the same sections as a named one, and no name on anything.
const free = await page.request.get(`${BASE}/golden`).then((r) => r.text());
const number = (free.match(/href="\/golden\/ticket\/(\d+)"/) || [])[1] || "99";
await page.goto(`${BASE}/golden/ticket/${number}`, { waitUntil: "networkidle", timeout: 120_000 });
await dismissConsent(page);

// The page's paper ground off, so each capture has transparent corners to
// flatten onto white rather than beige ones.
await page.addStyleTag({ content: "html, body, body > div, .min-h-screen { background: transparent !important; }" });

// The three demos and the golden mind: the card column of each section.
for (const id of ["collab", "tools", "publish"]) {
    const card = page.locator(`[data-showcase-card="${id}"] > div > div`).last();
    await save(await shoot(page, card, 7000), `showcase-${id}`);
}
{
    const card = page.locator('[data-showcase-card="golden-mind"] > div > div').last();
    // The brain fills over several seconds before it holds, gold.
    await save(await shoot(page, card, 14000), "showcase-science");
}

// The benefit icons: each card's rounded tile, the sixth one included.
{
    const heading = page.getByRole("heading", { name: "Your benefits as a golden member" });
    const tiles = heading.locator("xpath=following-sibling::div[1]/div/div[1]");
    const ids = ["lifetime", "vouchers", "events", "host", "perks", "more"];
    const count = await tiles.count();
    for (let i = 0; i < Math.min(count, ids.length); i++) {
        await save(await shoot(page, tiles.nth(i), 300), `benefit-${ids[i]}`, { width: 128, format: "png" });
    }
}

// The globe, once its tiles and pins are in.
{
    const heading = page.getByRole("heading", { name: "We bring human writers together" });
    const map = heading.locator("xpath=following-sibling::div[1]");
    // The zoom buttons are for a hand on the page; in a picture they are two
    // buttons that do nothing.
    await map.evaluate((el) => {
        el.querySelectorAll("button").forEach((b) => {
            if (b.querySelector(".lucide-plus, .lucide-minus")) b.style.visibility = "hidden";
        });
    });
    await save(await shoot(page, map, 9000), "together");
}

// The film's frame, play button and all. It links to the film; nothing plays
// in an inbox.
{
    const frame = page.getByRole("button", { name: "Play the video" }).locator("xpath=..");
    await save(await shoot(page, frame, 2500), "film");
}

// The seal: GoldenBadge's own drawing, rasterised directly, since no page
// that anyone can open without a ticket shows it. The colours are read from
// goldPalette.ts rather than copied, so the seal cannot drift from the page's.
{
    const palette = await readFile(path.join(process.cwd(), "app", "golden", "goldPalette.ts"), "utf8");
    const gold = (name) => palette.match(new RegExp(`${name}:\\s*'(#[0-9A-Fa-f]{6})'`))[1];
    const badge = await readFile(path.join(process.cwd(), "app", "golden", "components", "GoldenBadge.tsx"), "utf8");
    const [star, check] = [...badge.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${gold("bright")}"/><stop offset="0.55" stop-color="${gold("mid")}"/><stop offset="1" stop-color="${gold("deep")}"/>
        </linearGradient></defs>
        <path d="${star}" fill="url(#g)" stroke="${gold("mid")}" stroke-width="8" stroke-linejoin="round"/>
        <path d="${check}" fill="none" stroke="#1F1F1F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    await save(Buffer.from(svg), "seal", { width: 144, format: "png" });
}

await browser.close();
