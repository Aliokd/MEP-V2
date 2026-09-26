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
// Shown at 440px in the email. 600 is sharp enough on a phone's high-density
// screen without doubling the file, which a GIF feels far more than a JPEG.
const WIDTH = 600;
const FPS = Number(process.env.GIF_FPS || 10);
const RECORD_SECONDS = Number(process.env.GIF_RECORD || 30);
const MIN_LOOP_SECONDS = 4;
const MAX_SECONDS = 12;
const COLOURS = 128;
// Each demo opens on an empty card and draws itself in. The loop starts once
// it has, so the first frame, the one Outlook shows as a still, has something
// on it.
const START_SECONDS = Number(process.env.GIF_START || 2);

// `start`: seconds in, once the card has drawn itself (see START_SECONDS).
// The golden mind has no empty opening; its first frame is the grey brain at
// 0%, which is where its loop begins and ends. `colours`: the tools demo
// crosses a notebook photo and a textured ground, and gets fewer to stay light.
const CARDS = [
    { id: "collab", selector: '[data-showcase-card="collab"] > div > div' },
    { id: "tools", selector: '[data-showcase-card="tools"] > div > div', colours: 80 },
    { id: "publish", selector: '[data-showcase-card="publish"] > div > div' },
    { id: "science", selector: '[data-showcase-card="golden-mind"] > div > div', start: 0.2 },
];

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
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await dismissConsent(page);
    // Same white ground as the stills, so the rounded corners sit on the
    // email card rather than on a square of the page's beige.
    await page.addStyleTag({ content: "html, body, body > div, .min-h-screen { background: #FFFFFF !important; }" });

    const target = page.locator(card.selector).last();
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        frames.push({ data, t: metadata.timestamp });
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });

    // Scrolled into the middle of the screen in one jump, which is what starts
    // the demo, and recorded from that moment.
    await target.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: 1280, maxHeight: 900, everyNthFrame: 1 });
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
    let best = { i: -1, d: Infinity };
    for (let i = start + MIN_LOOP_SECONDS * FPS; i < thumbs.length; i++) {
        const d = distance(thumbs[start], thumbs[i]);
        if (d < best.d) best = { i, d };
    }
    // Under ~2 grey levels on average reads as the same picture.
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
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

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
        "-vf", `fps=${FPS},${crop},scale=${WIDTH}:-2:flags=lanczos`,
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
        "-vf", `split[a][b];[a]palettegen=max_colors=${card.colours ?? COLOURS}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        "-loop", "0", file,
    ]);
    const size = (await stat(file)).size;
    console.log(
        `${card.id}: ${count} raw frames, loop ${(frames / FPS).toFixed(1)}s ${loop.looped ? "(seamless)" : "(cut, no return found)"}, ${Math.round(size / 1024)} KB`,
    );
    await rm(work, { recursive: true, force: true });
}

await browser.close();
