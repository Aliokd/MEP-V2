/**
 * Records the Golden page's four showcase animations as looping GIFs for the
 * golden ticket email (lib/email/templates/goldenTicket.ts).
 *
 * Why GIF and not MP4: an inbox is not a browser. Gmail and Outlook strip
 * <video> outright and only Apple Mail plays it, so a video in an email is a
 * blank box for most readers. An animated GIF plays in Gmail, Apple Mail, iOS
 * and Yahoo; Outlook on Windows shows its first frame, which is why each loop
 * starts on a frame that reads on its own.
 *
 * How: each card is scrolled into view on a fresh page, so its demo starts
 * from the beginning, and Chrome's screencast records it frame by frame with
 * timestamps. The frames are resampled to a steady rate, then the loop is
 * found by looking for the moment the demo returns to its opening frame, so
 * the GIF restarts where the animation does rather than jumping. A demo that
 * never returns is cut at MAX_SECONDS.
 *
 * Run against a dev server on the page's current code (needs ffmpeg on PATH):
 *
 *   node scripts/capture-golden-email-animations.mjs [baseUrl] [id ...]
 *
 * Writes public/assets/email/golden/showcase-{id}.gif. The still captures
 * (scripts/capture-golden-email-assets.mjs) stay as they are.
 *
 * After re-capturing, bump ASSET_VERSION in lib/email/templates/goldenTicket.ts:
 * the pictures are cached for a week under their address, by browsers and by
 * Gmail's image proxy, so replaced files otherwise keep showing the old ones.
 */

import { chromium } from "playwright";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const BASE = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3000";
const ONLY = args.length ? args : null;

const OUT = path.join(process.cwd(), "public", "assets", "email", "golden");
// Shown at 440px in the email, so 880 is what a retina screen needs to draw
// it sharp; at 600 it was visibly soft. gifsicle's lossy pass (below) is what
// makes that affordable.
const WIDTH = Number(process.env.GIF_WIDTH || 880);
// Recorded at twice the size and scaled down, so small UI text stays crisp.
// Done with CSS zoom on a window twice as large, not a device pixel ratio:
// Chrome's screencast captures in CSS pixels whatever the ratio, so a 2x
// ratio came back as a 1x frame. Zoom keeps the 1280px layout, drawn larger.
const ZOOM = Number(process.env.GIF_ZOOM || 2);
const FPS = Number(process.env.GIF_FPS || 10);
// Played faster than the page. The page's demos are paced for someone
// watching; an email is scrolled past, and a 16 second loop both reads as
// slow there and weighs more, which on a slow connection makes a GIF crawl
// while it loads. 1.5x keeps every step legible.
const SPEED = Number(process.env.GIF_SPEED || 1.5);
const RECORD_SECONDS = Number(process.env.GIF_RECORD || 36);
const MIN_LOOP_SECONDS = 3;
const MAX_SECONDS = 9;
const COLOURS = 256;
// Each demo opens on an empty card and draws itself in. The loop starts once
// it has, so the first frame, the one Outlook shows as a still, has something
// on it.
const START_SECONDS = Number(process.env.GIF_START || 2);

// `start`: seconds in, once the card has drawn itself (see START_SECONDS).
// The golden mind has no empty opening; its first frame is the grey brain at
// 0%, which is where its loop begins and ends.
//
// `ground`: the golden mind card is white at 30% on the page (CARD_BG in
// ProgramShowcase), which reads as a tint only over the page's beige. The
// email is white, so it is recorded in the colour that 30% white over
// #E6E3DB comes to, #EEEBE6, and looks in the inbox as it does on the page.
const CARDS = [
    { id: "collab", selector: '[data-showcase-card="collab"] > div > div' },
    { id: "tools", selector: '[data-showcase-card="tools"] > div > div' },
    { id: "publish", selector: '[data-showcase-card="publish"] > div > div' },
    { id: "science", selector: '[data-showcase-card="golden-mind"] > div > div', start: 0.2, ground: "#EEEBE6" },
];

/**
 * gifsicle (https://www.lcdf.org/gifsicle/), from GIFSICLE or PATH. Not a
 * project dependency, since nothing at build or run time needs it; install it
 * anywhere, e.g. `npm install --prefix <somewhere> gifsicle` and point GIFSICLE
 * at node_modules/gifsicle/vendor/gifsicle.exe. Without it the GIFs come out
 * about twice as heavy, and the run says so.
 */
function findGifsicle() {
    const candidates = [process.env.GIFSICLE, "gifsicle"].filter(Boolean);
    for (const bin of candidates) {
        try {
            execFileSync(bin, ["--version"], { stdio: "ignore" });
            return bin;
        } catch {
            /* next */
        }
    }
    console.warn("gifsicle not found: GIFs will be about twice as heavy. Set GIFSICLE to its path.");
    return null;
}
const GIFSICLE = findGifsicle();
const LOSSY = Number(process.env.GIF_LOSSY || 40);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissConsent(page) {
    const necessary = page.getByRole("button", { name: "Only necessary" });
    if (await necessary.isVisible({ timeout: 5000 }).catch(() => false)) {
        await necessary.click();
        await sleep(600);
    }
}

/** Records the card's region for RECORD_SECONDS; returns timestamped PNG frames. */
async function record(browser, url, card, dir) {
    // 800px wide: the sections stack there and the card keeps its full 716px,
    // and a smaller window is less for software rendering to paint.
    const page = await browser.newPage({ viewport: { width: 800 * ZOOM, height: 720 * ZOOM }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await dismissConsent(page);
    // Same white ground as the stills, so the rounded corners sit on the
    // email card rather than on a square of the page's beige.
    await page.addStyleTag({ content: "html, body, body > div, .min-h-screen { background: #FFFFFF !important; }" });
    await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, ZOOM);
    await sleep(800);

    // Everything else that animates goes, above all the globe: with no GPU its
    // WebGL is drawn in software, which starves the page's timers and slows
    // the demo being recorded, so the GIF came out slower than the page plays.
    // Only the card being recorded keeps running.
    const target = page.locator(card.selector).last();
    await target.evaluate((keep, ground) => {
        document.querySelectorAll("canvas, video, iframe").forEach((el) => {
            if (!keep.contains(el)) el.remove();
        });
        // Nothing but the card is painted: at twice the size, software
        // rendering of the whole page slowed the demo and dropped frames.
        const style = document.createElement("style");
        style.textContent = "body * { visibility: hidden !important; } [data-rec-keep], [data-rec-keep] * { visibility: visible !important; } *, *::before, *::after { backdrop-filter: none !important; }";
        keep.setAttribute("data-rec-keep", "");
        document.head.appendChild(style);
        // A card whose ground is see-through on the page is given the colour
        // it shows there, since behind it here is white, not the page's beige.
        if (ground && keep.firstElementChild) keep.firstElementChild.style.backgroundColor = ground;
    }, card.ground ?? null);

    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        frames.push({ data, t: metadata.timestamp });
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });

    // Scrolled into the middle of the screen in one jump, which is what starts
    // the demo, and recorded from that moment.
    await target.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: 800 * ZOOM, maxHeight: 720 * ZOOM, everyNthFrame: 1 });
    await sleep(RECORD_SECONDS * 1000);
    await cdp.send("Page.stopScreencast");
    const box = await target.boundingBox();
    await page.close();

    // The screencast only sends a frame when something changed, so each one
    // holds until the next: the concat list gives every frame its duration.
    const lines = [];
    for (let i = 0; i < frames.length; i++) {
        const file = `f${String(i).padStart(5, "0")}.png`;
        await writeFile(path.join(dir, file), Buffer.from(frames[i].data, "base64"));
        const next = frames[i + 1]?.t ?? frames[i].t + 0.5;
        lines.push(`file '${file}'`, `duration ${(next - frames[i].t).toFixed(4)}`);
    }
    lines.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.png'`);
    await writeFile(path.join(dir, "list.txt"), lines.join("\n"));
    return { box, count: frames.length };
}

/** Grey 48px thumbnails, for comparing frames cheaply. */
async function thumb(file) {
    return sharp(file).resize(48, 48, { fit: "fill" }).greyscale().raw().toBuffer();
}
function distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    return sum / a.length;
}

/**
 * The loop: the first time, after MIN_LOOP_SECONDS, that the demo is back on
 * the frame it started from. Frame 1 rather than 0, so a first frame caught
 * mid-paint does not decide it. Returns [start, end) in frame indexes.
 */
async function findLoop(stepDir, startSeconds = START_SECONDS) {
    const files = (await readdir(stepDir)).filter((f) => f.endsWith(".png")).sort();
    const thumbs = await Promise.all(files.map((f) => thumb(path.join(stepDir, f))));
    const start = Math.min(Math.round(startSeconds * FPS), thumbs.length - 1);
    // The FIRST return, not the closest one anywhere: a later cycle can match
    // a hair better and would double the loop. Once under the threshold, walk
    // on to the bottom of that dip, which is where the frames line up best.
    let best = { i: -1, d: Infinity };
    for (let i = start + MIN_LOOP_SECONDS * FPS; i < thumbs.length; i++) {
        const d = distance(thumbs[start], thumbs[i]);
        if (best.i < 0 && d >= 2) continue;
        if (d < best.d) best = { i, d };
        else if (best.i >= 0 && d > best.d + 1) break;
    }
    if (process.env.GIF_DEBUG) {
        const curve = [];
        for (let i = start + FPS; i < thumbs.length; i += FPS / 2) curve.push(`${((i - start) / FPS).toFixed(1)}s:${distance(thumbs[start], thumbs[Math.round(i)]).toFixed(1)}`);
        console.log(curve.join(" "));
    }
    if (best.i > 0 && best.d < 2) return { start, end: best.i, looped: true, files };
    return { start, end: Math.min(thumbs.length, start + MAX_SECONDS * FPS), looped: false, files };
}

await mkdir(OUT, { recursive: true });
const free = await fetch(`${BASE}/golden`).then((r) => r.text());
const number = (free.match(/href="\/golden\/ticket\/(\d+)"/) || [])[1] || "99";
const url = `${BASE}/golden/ticket/${number}`;
const browser = await chromium.launch();

for (const card of CARDS.filter((c) => !ONLY || ONLY.includes(c.id))) {
    const work = path.join(os.tmpdir(), `golden-gif-${card.id}`);
    const steady = path.join(work, "steady");
    await rm(work, { recursive: true, force: true });
    await mkdir(steady, { recursive: true });

    const { box, count } = await record(browser, url, card, work);
    const crop = `crop=${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(box.x)}:${Math.round(box.y)}`;

    // A steady FPS, cropped to the card and scaled to the email's size.
    execFileSync("ffmpeg", [
        "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(work, "list.txt"),
        "-vf", `setpts=PTS/${SPEED},fps=${FPS},${crop},scale=${WIDTH}:-2:flags=lanczos`,
        path.join(steady, "s%05d.png"),
    ]);

    const loop = await findLoop(steady, card.start ?? START_SECONDS);
    const frames = loop.end - loop.start;

    // One palette for the whole loop, built from what changes, and each frame
    // stored as only the rectangle that moved: a UI demo is mostly still, and
    // that is what keeps the file small.
    const file = path.join(OUT, `showcase-${card.id}.gif`);
    execFileSync("ffmpeg", [
        "-y", "-loglevel", "error", "-framerate", String(FPS), "-start_number", String(loop.start + 1),
        "-i", path.join(steady, "s%05d.png"), "-frames:v", String(frames),
        "-vf", `split[a][b];[a]palettegen=max_colors=${card.colours ?? COLOURS}:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
        "-loop", "0", file,
    ]);
    // The lossy pass: gifsicle nudges pixels between frames so more of each
    // frame repeats the one before, roughly halving the file with no visible
    // change at this size. Full colour and no dither pattern above, because
    // this is where the weight comes off instead.
    if (GIFSICLE) execFileSync(GIFSICLE, ["-O3", `--lossy=${LOSSY}`, "--batch", file]);
    const size = (await stat(file)).size;
    console.log(
        `${card.id}: ${count} raw frames, loop ${(frames / FPS).toFixed(1)}s ${loop.looped ? "(seamless)" : "(cut, no return found)"}, ${Math.round(size / 1024)} KB`,
    );
    if (!process.env.GIF_KEEP) await rm(work, { recursive: true, force: true });
}

await browser.close();
