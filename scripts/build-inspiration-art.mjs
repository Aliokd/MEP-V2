/**
 * Minimal nature artwork for the Inspirations deck.
 *
 * Every card used to carry an AI-painted landscape: a 1 MB PNG, busy with
 * detail, and unmistakably generated. The deck now draws its own scenes: a
 * gradient sky, a sun or moon, and a few layered silhouettes whose colour
 * steps from the horizon down to a near-ink foreground. Flat, quiet, and
 * consistent from card to card, with each palette chosen for the card's mood.
 *
 *   node scripts/build-inspiration-art.mjs
 *
 * Writes public/assets/inspiration/minimal/<card>.webp (square, 1200px). The
 * scenes are deterministic, so re-running produces the same files; change a
 * spec below and re-run to redraw one card.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(process.cwd(), 'public', 'assets', 'inspiration', 'minimal');
const W = 1200;
const H = 1200;

/*
 * Composition notes. The card is landscape on a desktop (about 3:2) and
 * portrait on a phone (about 5:8), and both crop from the centre of this
 * square. Anything that matters sits inside x 240..960 and y 220..980 so no
 * crop loses it; the horizon lives around y 640..700 so the glass title panel
 * along the bottom always lands on the darkest layer.
 */

// ---------------------------------------------------------------- helpers

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (c) => c.replace('#', '');
const toRgb = (c) => {
    const h = hex(c);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = ([r, g, b]) =>
    '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
// Linear blend between two colours; t=0 is a, t=1 is b.
const mix = (a, b, t) => {
    const A = toRgb(a);
    const B = toRgb(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
};

/*
 * Ridge lines. A smooth ridge is a sum of low-frequency sines sampled across
 * the width and joined with quadratic curves through the midpoints; a jagged
 * ridge is a random walk of peaks joined with straight lines. Both return a
 * closed path that runs off the bottom of the canvas so the layer reads as a
 * solid mass, not an outline.
 */
function smoothRidge(points) {
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        const [nx, ny] = points[i + 1];
        d += ` Q ${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    return d;
}

function closeDown(d) {
    return `${d} L ${W + 40} ${H + 40} L -40 ${H + 40} Z`;
}

// Returns the closed path and `yAt(x)`, so anything standing on the ridge
// (a tree, a boulder) can be planted on the ground rather than near it.
function hills({ base, amp, waves, seed, step = 40, skew = 0 }) {
    const r = rng(seed);
    const harmonics = Array.from({ length: waves }, (_, k) => ({
        f: (0.9 + r() * 0.8) * (k + 1) * (Math.PI * 2) / W,
        p: r() * Math.PI * 2,
        a: amp / (k + 1),
    }));
    const yAt = (x) => {
        let y = base;
        for (const h of harmonics) {
            // A little skew makes a wind-shaped crest: steep on one face,
            // long on the other. Dunes use it; hills leave it at 0.
            const s = Math.sin(x * h.f + h.p);
            y += h.a * (skew ? Math.sign(s) * Math.pow(Math.abs(s), 1 - skew * 0.5) : s);
        }
        return y;
    };
    const pts = [];
    for (let x = -40; x <= W + 40; x += step) pts.push([x, yAt(x)]);
    return { d: closeDown(smoothRidge(pts)), yAt };
}

function mountains({ base, amp, seed, minGap = 70, maxGap = 150, sharpness = 1 }) {
    const r = rng(seed);
    const pts = [[-40, base + amp * 0.2]];
    let x = -40;
    let up = r() > 0.5;
    while (x < W + 40) {
        x += minGap + r() * (maxGap - minGap);
        const y = up ? base - amp * (0.35 + r() * 0.65) : base + amp * (0.05 + r() * 0.25) * sharpness;
        pts.push([Math.min(x, W + 40), y]);
        up = !up;
    }
    let d = `M ${pts[0][0]} ${pts[0][1].toFixed(1)}`;
    for (const [px, py] of pts.slice(1)) d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    const yAt = (qx) => {
        for (let i = 1; i < pts.length; i++) {
            if (qx <= pts[i][0]) {
                const [x0, y0] = pts[i - 1];
                const [x1, y1] = pts[i];
                return y0 + ((qx - x0) / (x1 - x0)) * (y1 - y0);
            }
        }
        return base;
    };
    return { d: closeDown(d), yAt };
}

// A single large peak with a lighter snow cap, for the scenes that want one
// mountain rather than a range.
function peak({ cx, top, base, halfWidth, snow, color, snowColor, seed }) {
    const r = rng(seed);
    const left = [];
    const right = [];
    const n = 6;
    for (let i = 1; i <= n; i++) {
        const t = i / n;
        const jitter = (r() - 0.5) * 24;
        left.push([cx - halfWidth * t, top + (base - top) * t + jitter]);
        right.push([cx + halfWidth * t, top + (base - top) * t + (r() - 0.5) * 24]);
    }
    let d = `M ${left[left.length - 1][0].toFixed(1)} ${(base + 200).toFixed(1)}`;
    for (const [x, y] of [...left].reverse()) d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    d += ` L ${cx} ${top}`;
    for (const [x, y] of right) d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    d += ` L ${right[right.length - 1][0].toFixed(1)} ${(base + 200).toFixed(1)} Z`;
    let out = `<path d="${d}" fill="${color}"/>`;
    if (snow) {
        const t = snow;
        const sl = left.slice(0, 2);
        const sr = right.slice(0, 2);
        let s = `M ${cx} ${top}`;
        for (const [x, y] of sr) s += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        // A ragged lower edge to the cap so it reads as snow, not a hat.
        s += ` L ${(cx + halfWidth * 0.22).toFixed(1)} ${(top + (base - top) * t * 0.85).toFixed(1)}`;
        s += ` L ${(cx + halfWidth * 0.06).toFixed(1)} ${(top + (base - top) * t * 1.15).toFixed(1)}`;
        s += ` L ${(cx - halfWidth * 0.1).toFixed(1)} ${(top + (base - top) * t * 0.9).toFixed(1)}`;
        s += ` L ${(cx - halfWidth * 0.25).toFixed(1)} ${(top + (base - top) * t * 1.05).toFixed(1)}`;
        for (const [x, y] of [...sl].reverse()) s += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        s += ' Z';
        out += `<path d="${s}" fill="${snowColor}"/>`;
    }
    return out;
}

// Flat-topped canyon walls: a run of mesas and buttes.
function mesas({ base, amp, seed, color }) {
    const r = rng(seed);
    let d = `M -40 ${base}`;
    let x = -40;
    while (x < W + 40) {
        const w = 90 + r() * 220;
        const h = amp * (0.3 + r() * 0.7);
        const slope = 14 + r() * 40;
        d += ` L ${x.toFixed(1)} ${base} L ${(x + slope).toFixed(1)} ${(base - h).toFixed(1)} L ${(x + w - slope).toFixed(1)} ${(base - h).toFixed(1)} L ${(x + w).toFixed(1)} ${base}`;
        x += w + 20 + r() * 80;
    }
    d += ` L ${W + 40} ${base}`;
    return `<path d="${closeDown(d)}" fill="${color}"/>`;
}

function pine(x, baseY, h, color) {
    const w = h * 0.42;
    const tiers = 3;
    let out = `<rect x="${(x - h * 0.03).toFixed(1)}" y="${(baseY - h * 0.16).toFixed(1)}" width="${(h * 0.06).toFixed(1)}" height="${(h * 0.16).toFixed(1)}" fill="${color}"/>`;
    for (let i = 0; i < tiers; i++) {
        const top = baseY - h + (i * h * 0.26);
        const bottom = baseY - h * 0.12 - (tiers - 1 - i) * h * 0.24;
        const hw = w * (0.45 + i * 0.275);
        out += `<path d="M ${x} ${top.toFixed(1)} L ${(x + hw).toFixed(1)} ${bottom.toFixed(1)} L ${(x - hw).toFixed(1)} ${bottom.toFixed(1)} Z" fill="${color}"/>`;
    }
    return out;
}

function roundTree(x, baseY, h, color) {
    const r = h * 0.34;
    return (
        `<rect x="${(x - h * 0.035).toFixed(1)}" y="${(baseY - h * 0.5).toFixed(1)}" width="${(h * 0.07).toFixed(1)}" height="${(h * 0.5).toFixed(1)}" fill="${color}"/>` +
        `<circle cx="${x}" cy="${(baseY - h + r).toFixed(1)}" r="${r.toFixed(1)}" fill="${color}"/>` +
        `<circle cx="${(x - r * 0.75).toFixed(1)}" cy="${(baseY - h + r * 1.45).toFixed(1)}" r="${(r * 0.8).toFixed(1)}" fill="${color}"/>` +
        `<circle cx="${(x + r * 0.75).toFixed(1)}" cy="${(baseY - h + r * 1.4).toFixed(1)}" r="${(r * 0.85).toFixed(1)}" fill="${color}"/>`
    );
}

function sapling(x, baseY, h, color) {
    return (
        `<path d="M ${x} ${baseY} C ${x} ${baseY - h * 0.5} ${x + 4} ${baseY - h * 0.7} ${x + 2} ${baseY - h}" stroke="${color}" stroke-width="${(h * 0.06).toFixed(1)}" fill="none" stroke-linecap="round"/>` +
        `<ellipse cx="${(x - h * 0.28).toFixed(1)}" cy="${(baseY - h * 0.62).toFixed(1)}" rx="${(h * 0.3).toFixed(1)}" ry="${(h * 0.14).toFixed(1)}" transform="rotate(-28 ${(x - h * 0.28).toFixed(1)} ${(baseY - h * 0.62).toFixed(1)})" fill="${color}"/>` +
        `<ellipse cx="${(x + h * 0.3).toFixed(1)}" cy="${(baseY - h * 0.86).toFixed(1)}" rx="${(h * 0.3).toFixed(1)}" ry="${(h * 0.14).toFixed(1)}" transform="rotate(24 ${(x + h * 0.3).toFixed(1)} ${(baseY - h * 0.86).toFixed(1)})" fill="${color}"/>`
    );
}

function stars(seed, count, color, yMax = 560) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
        const x = r() * W;
        const y = r() * yMax;
        const rad = 1.2 + r() * 2.2;
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${color}" opacity="${(0.45 + r() * 0.5).toFixed(2)}"/>`;
    }
    return out;
}

function cloud(x, y, s, color) {
    return (
        `<g fill="${color}">` +
        `<circle cx="${x}" cy="${y}" r="${s * 0.55}"/>` +
        `<circle cx="${x - s * 0.6}" cy="${y + s * 0.12}" r="${s * 0.4}"/>` +
        `<circle cx="${x + s * 0.62}" cy="${y + s * 0.1}" r="${s * 0.44}"/>` +
        `<rect x="${x - s * 0.9}" y="${y + s * 0.05}" width="${s * 1.85}" height="${s * 0.5}" rx="${s * 0.25}"/>` +
        `</g>`
    );
}

function birds(seed, count, color, region) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
        const x = region.x + r() * region.w;
        const y = region.y + r() * region.h;
        const s = 8 + r() * 8;
        out += `<path d="M ${x - s} ${y} q ${s / 2} ${-s * 0.6} ${s} 0 q ${s / 2} ${-s * 0.6} ${s} 0" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    }
    return out;
}

// A winding river or path from the horizon to the bottom edge, widening as
// it nears the viewer.
function river({ fromX, horizon, color, seed, widthNear = 260, widthFar = 10, curve = 1 }) {
    const r = rng(seed);
    const n = 7;
    const centre = [];
    let x = fromX;
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const y = horizon + (H + 40 - horizon) * t;
        if (i > 0) x += (r() - 0.5) * 220 * curve * (0.4 + t);
        centre.push([x, y, widthFar + (widthNear - widthFar) * Math.pow(t, 1.6)]);
    }
    const left = centre.map(([cx, cy, w]) => [cx - w / 2, cy]);
    const right = centre.map(([cx, cy, w]) => [cx + w / 2, cy]).reverse();
    return `<path d="${smoothRidge(left)} ${smoothRidge(right).replace(/^M/, 'L')} Z" fill="${color}"/>`;
}

function fogBand(y, h, color, opacity) {
    const id = `fog${Math.round(y)}`;
    return (
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${color}" stop-opacity="0"/>` +
        `<stop offset="0.5" stop-color="${color}" stop-opacity="${opacity}"/>` +
        `<stop offset="1" stop-color="${color}" stop-opacity="0"/>` +
        `</linearGradient></defs>` +
        `<rect x="-40" y="${y}" width="${W + 80}" height="${h}" fill="url(#${id})"/>`
    );
}

function sun({ x, y, r, color, glow, glowColor }) {
    const id = `glow${Math.round(x)}${Math.round(y)}`;
    let out = '';
    if (glow) {
        out +=
            `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${glowColor || color}" stop-opacity="${glow}"/>` +
            `<stop offset="1" stop-color="${glowColor || color}" stop-opacity="0"/></radialGradient></defs>` +
            `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="url(#${id})"/>`;
    }
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
    return out;
}

function crescent(x, y, r, color) {
    const id = `moon${Math.round(x)}`;
    return (
        `<defs><mask id="${id}"><rect x="0" y="0" width="${W}" height="${H}" fill="white"/>` +
        `<circle cx="${x + r * 0.45}" cy="${y - r * 0.25}" r="${r * 0.9}" fill="black"/></mask></defs>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" mask="url(#${id})"/>`
    );
}

// Calm water: a flat band with the sun's reflection and a few horizontal
// ripples, optionally with a flipped, faded copy of a ridge in it.
function water({ top, color, ripple, reflect, sunX, sunColor, seed }) {
    const r = rng(seed);
    let out = `<rect x="-40" y="${top}" width="${W + 80}" height="${H - top + 40}" fill="${color}"/>`;
    if (reflect) {
        out += `<g transform="translate(0 ${top * 2}) scale(1 -1)" opacity="0.22">${reflect}</g>`;
    }
    if (sunX !== undefined) {
        for (let i = 0; i < 9; i++) {
            const y = top + 14 + i * (18 + i * 4);
            const w = 40 + i * 26 + r() * 30;
            out += `<rect x="${(sunX - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="3" rx="1.5" fill="${sunColor}" opacity="${(0.55 - i * 0.05).toFixed(2)}"/>`;
        }
    }
    for (let i = 0; i < 14; i++) {
        const y = top + 20 + r() * 220;
        const w = 60 + r() * 260;
        const x = r() * W;
        out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="2" rx="1" fill="${ripple}" opacity="0.5"/>`;
    }
    return out;
}

function waves({ top, rows, colorFrom, colorTo, seed, amp = 12 }) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < rows; i++) {
        const t = i / Math.max(1, rows - 1);
        const y = top + i * ((H - top) / rows) * 0.75;
        const pts = [];
        const f = (Math.PI * 2) / (170 + r() * 90);
        const p = r() * Math.PI * 2;
        for (let x = -40; x <= W + 40; x += 30) pts.push([x, y + Math.sin(x * f + p) * amp * (0.6 + t)]);
        out += `<path d="${closeDown(smoothRidge(pts))}" fill="${mix(colorFrom, colorTo, t)}"/>`;
    }
    return out;
}

function rain(seed, color, count = 90) {
    const r = rng(seed);
    let out = `<g stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.32">`;
    for (let i = 0; i < count; i++) {
        const x = r() * W;
        const y = r() * H;
        const len = 26 + r() * 46;
        out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - len * 0.18).toFixed(1)}" y2="${(y + len).toFixed(1)}"/>`;
    }
    return out + '</g>';
}

function leaves(seed, color, count, region) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
        const x = region.x + r() * region.w;
        const y = region.y + r() * region.h;
        const s = 5 + r() * 7;
        const rot = r() * 360;
        out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}" ry="${(s * 0.55).toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${color}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`;
    }
    return out;
}

function sky(top, bottom, horizon = 0.72) {
    return (
        `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${top}"/><stop offset="${horizon}" stop-color="${bottom}"/>` +
        `<stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
        `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky)"/>`
    );
}

// Layered silhouettes: `n` ridges from far (near the horizon colour) to near
// (the foreground colour), each a bit lower and a bit bolder than the last.
function layers({ n, far, near, baseTop, baseStep, amp, seed, kind = 'hills', ampGrow = 1, waves: wv = 3, skew = 0, decorate }) {
    let out = '';
    for (let i = 0; i < n; i++) {
        const t = n === 1 ? 1 : i / (n - 1);
        const color = mix(far, near, Math.pow(t, 0.85));
        const base = baseTop + baseStep * i;
        const a = amp * Math.pow(ampGrow, i);
        const s = seed + i * 977;
        const ridge = kind === 'mountains'
            ? mountains({ base, amp: a, seed: s, minGap: 60 + i * 30, maxGap: 140 + i * 60 })
            : hills({ base, amp: a, waves: wv, seed: s, skew });
        out += `<path d="${ridge.d}" fill="${color}"/>`;
        if (decorate) out += decorate(i, color, ridge.yAt, s);
    }
    return out;
}

// -------------------------------------------------------------------- scenes

const SCENES = {
    // Autumn dusk, a few leaves on the wind.
    'therapy_releasing_regret': () => {
        const far = '#D9A876';
        const near = '#4A3226';
        return (
            sky('#E7C5A0', '#F4E0C2') +
            sun({ x: 560, y: 520, r: 76, color: '#F8E6C2', glow: 0.55, glowColor: '#F7D9A8' }) +
            layers({ n: 4, far, near, baseTop: 640, baseStep: 95, amp: 60, seed: 11, ampGrow: 1.12, waves: 2,
                decorate: (i, color, yAt) => (i === 3 ? pine(300, yAt(300) + 6, 150, color) + pine(348, yAt(348) + 6, 105, color) : '') }) +
            leaves(23, '#C9773F', 14, { x: 360, y: 380, w: 560, h: 420 })
        );
    },

    // Still lake, mirrored range, small moon.
    'therapy_finding_stillness': () => {
        const ridge = `<path d="${mountains({ base: 600, amp: 190, seed: 41, minGap: 90, maxGap: 170 }).d}" fill="#A9BCC8"/>` +
            `<path d="${mountains({ base: 640, amp: 120, seed: 42, minGap: 110, maxGap: 200 }).d}" fill="#7F98A8"/>`;
        return (
            sky('#C9D6DE', '#EAEFF1', 0.6) +
            sun({ x: 760, y: 330, r: 30, color: '#F3F1EA', glow: 0.35 }) +
            ridge +
            water({ top: 700, color: '#B8CAD4', ripple: '#DDE6EA', reflect: ridge, seed: 43 }) +
            `<path d="${hills({ base: 950, amp: 40, waves: 2, seed: 44 }).d}" fill="#3E505C"/>`
        );
    },

    // A sapling on the nearest hill at sunrise.
    'therapy_growth_pain': () => (
        sky('#DCE5C8', '#F2F0DE') +
        sun({ x: 640, y: 560, r: 64, color: '#F6F0C9', glow: 0.5 }) +
        layers({ n: 4, far: '#A9BE97', near: '#3F5238', baseTop: 660, baseStep: 90, amp: 55, seed: 71, waves: 2,
            decorate: (i, color, yAt) => (i === 3 ? sapling(600, yAt(600) + 4, 150, color) : '') })
    ),

    // Hills lost in fog, a path leading into it.
    'therapy_embracing_uncertainty': () => (
        sky('#D3D0DB', '#EEECF1', 0.6) +
        sun({ x: 600, y: 440, r: 52, color: '#F1EFF3', glow: 0.25 }) +
        layers({ n: 4, far: '#B9B4C6', near: '#55516A', baseTop: 620, baseStep: 100, amp: 70, seed: 91, waves: 2 }) +
        river({ fromX: 640, horizon: 860, color: '#DAD6E2', seed: 93, widthNear: 220, widthFar: 8, curve: 0.9 }) +
        fogBand(560, 200, '#F1EFF4', 0.9) +
        fogBand(700, 160, '#F1EFF4', 0.7) +
        fogBand(830, 120, '#F1EFF4', 0.45)
    ),

    // Night, stars, a crescent, one pine keeping watch.
    'therapy_grief_honoring': () => (
        sky('#2F3450', '#585D7A', 0.75) +
        stars(101, 70, '#E9E4D3') +
        crescent(760, 300, 44, '#E9E4D3') +
        layers({ n: 3, far: '#4A4F6D', near: '#232638', baseTop: 700, baseStep: 110, amp: 120, seed: 103, kind: 'mountains',
            decorate: (i, color, yAt) => (i === 2 ? pine(420, yAt(420) + 8, 190, color) : '') })
    ),

    // Sea cliffs, warm light, waves rolling in.
    'therapy_overcoming_fear': () => (
        sky('#E1B7A1', '#F1D8C6') +
        sun({ x: 500, y: 470, r: 70, color: '#F8DDB6', glow: 0.5 }) +
        `<path d="${hills({ base: 600, amp: 30, waves: 2, seed: 121 }).d}" fill="#C69A86"/>` +
        waves({ top: 660, rows: 4, colorFrom: '#D7A48E', colorTo: '#8E5A4C', seed: 123, amp: 16 }) +
        `<path d="M 780 1240 L 780 700 L 830 640 L 900 620 L 960 560 L 1040 540 L 1100 480 L 1240 470 L 1240 1240 Z" fill="#5C3A31"/>` +
        birds(125, 3, '#7A4F44', { x: 300, y: 300, w: 300, h: 120 })
    ),

    // Soft blush hills, a big gentle sun.
    'therapy_self_compassion': () => (
        sky('#F0D3CE', '#F9E9E3') +
        sun({ x: 600, y: 500, r: 120, color: '#FBE7DA', glow: 0.5, glowColor: '#F8D6C8' }) +
        layers({ n: 4, far: '#E2B6B0', near: '#6C4E4B', baseTop: 660, baseStep: 95, amp: 50, seed: 141, waves: 1, ampGrow: 1.15 })
    ),

    // Canyon walls in bold terracotta.
    'therapy_reclaiming_voice': () => (
        sky('#EFC5A2', '#F7E0C7') +
        sun({ x: 660, y: 430, r: 66, color: '#FAE4C6', glow: 0.45 }) +
        mesas({ base: 680, amp: 240, seed: 161, color: '#D3905F' }) +
        mesas({ base: 760, amp: 190, seed: 163, color: '#B26A44' }) +
        mesas({ base: 860, amp: 150, seed: 165, color: '#8B4B31' }) +
        `<path d="${hills({ base: 1000, amp: 20, waves: 1, seed: 167 }).d}" fill="#5E3423"/>`
    ),

    // Dunes: long, slow, wind-shaped curves.
    'therapy_patience_timing': () => (
        sky('#E9DBC4', '#F4ECDC') +
        sun({ x: 560, y: 420, r: 58, color: '#F8EDD2', glow: 0.4 }) +
        layers({ n: 5, far: '#DDC59C', near: '#7B6146', baseTop: 640, baseStep: 85, amp: 70, seed: 181, waves: 1, skew: 0.9, ampGrow: 1.1 })
    ),

    // An open meadow with one tree in it.
    'therapy_strength_vulnerability': () => (
        sky('#DAE2D4', '#EFF1E6') +
        sun({ x: 400, y: 470, r: 54, color: '#F5F2DE', glow: 0.4 }) +
        layers({ n: 4, far: '#B2C4A3', near: '#4B5E43', baseTop: 680, baseStep: 85, amp: 30, seed: 201, waves: 1,
            decorate: (i, color, yAt) => (i === 2 ? roundTree(620, yAt(620) + 6, 210, color) : '') })
    ),

    // Dark pines and a light coming up behind them.
    'therapy_navigating_darkness': () => (
        sky('#1F2A2E', '#7B968E', 0.82) +
        sun({ x: 600, y: 700, r: 140, color: '#C7D8C9', glow: 0.6, glowColor: '#B9CFC3' }) +
        layers({ n: 3, far: '#3B5054', near: '#121B1E', baseTop: 760, baseStep: 100, amp: 40, seed: 221, waves: 2,
            decorate: (i, color, yAt, s) => {
                const r = rng(s);
                let out = '';
                // Planted a little below the ridge so the lowest tier sits in the
                // ground; otherwise a flat-bottomed gap shows between neighbours.
                for (let x = -20; x < W + 40; x += 60 + r() * 70) { const h = 120 + r() * 140 + i * 40; out += pine(x, yAt(x) + h * 0.14, h, color); }
                return out;
            } })
    ),

    // Rain over a lake, everything rinsed clean.
    'therapy_cleansing_renewal': () => (
        sky('#C4D8D7', '#E5EEEC', 0.6) +
        `<path d="${hills({ base: 600, amp: 90, waves: 2, seed: 241 }).d}" fill="#93B3B0"/>` +
        `<path d="${hills({ base: 660, amp: 60, waves: 2, seed: 242 }).d}" fill="#5F8785"/>` +
        water({ top: 720, color: '#A9C6C3', ripple: '#D6E5E2', seed: 243 }) +
        rain(245, '#F2F7F6', 110) +
        `<path d="${hills({ base: 950, amp: 30, waves: 1, seed: 244 }).d}" fill="#34524F"/>`
    ),

    // Boulders on olive ground.
    'therapy_staying_grounded': () => (
        sky('#DCD4C5', '#EFEAE0') +
        sun({ x: 720, y: 400, r: 50, color: '#F4EEE0', glow: 0.3 }) +
        layers({ n: 3, far: '#B7AE8A', near: '#4E4838', baseTop: 680, baseStep: 100, amp: 40, seed: 261, waves: 1,
            decorate: (i, color, yAt) => (i === 2
                ? `<ellipse cx="520" cy="${(yAt(520) + 30).toFixed(1)}" rx="150" ry="95" fill="${color}"/>` +
                  `<ellipse cx="690" cy="${(yAt(690) + 40).toFixed(1)}" rx="90" ry="60" fill="${color}"/>` +
                  `<ellipse cx="400" cy="${(yAt(400) + 40).toFixed(1)}" rx="70" ry="42" fill="${color}"/>`
                : '') })
    ),

    // Two trees, side by side, under early stars.
    'therapy_feeling_connected': () => (
        sky('#8E96C9', '#DACEE1', 0.8) +
        stars(281, 40, '#F4F1F8', 420) +
        sun({ x: 600, y: 600, r: 70, color: '#EFE3EC', glow: 0.45, glowColor: '#E6D6E6' }) +
        layers({ n: 3, far: '#8087B4', near: '#383C58', baseTop: 700, baseStep: 100, amp: 50, seed: 283, waves: 1,
            decorate: (i, color, yAt) => (i === 2 ? pine(560, yAt(560) + 6, 180, color) + pine(650, yAt(650) + 6, 210, color) : '') })
    ),

    // A river bending its way through the valley.
    'therapy_accepting_change': () => (
        sky('#CDDCD5', '#E9F0EB') +
        sun({ x: 520, y: 470, r: 56, color: '#F3F4E4', glow: 0.35 }) +
        layers({ n: 4, far: '#9AB6AA', near: '#3A5449', baseTop: 640, baseStep: 95, amp: 70, seed: 301, waves: 2 }) +
        river({ fromX: 600, horizon: 700, color: '#D5E5DF', seed: 303, widthNear: 300, widthFar: 12, curve: 1.1 })
    ),

    // Storm light over dark ridges.
    'therapy_releasing_anger': () => (
        sky('#5E4F55', '#CC8E7A', 0.78) +
        sun({ x: 580, y: 560, r: 84, color: '#E38A66', glow: 0.55, glowColor: '#DD7E5F' }) +
        layers({ n: 3, far: '#96625A', near: '#33221F', baseTop: 690, baseStep: 110, amp: 150, seed: 321, kind: 'mountains' })
    ),

    // Sunrise over water, first light.
    'therapy_new_beginnings': () => {
        const horizon = 680;
        return (
            sky('#DCE3B8', '#F8F3D2') +
            sun({ x: 600, y: horizon - 10, r: 110, color: '#FCF4C6', glow: 0.55, glowColor: '#F3ECB0' }) +
            water({ top: horizon, color: '#C3CFA8', ripple: '#E5EBD0', sunX: 600, sunColor: '#F5EFC1', seed: 341 }) +
            `<path d="${hills({ base: 940, amp: 24, waves: 1, seed: 343 }).d}" fill="#6F7C58"/>` +
            birds(345, 4, '#8E9770', { x: 300, y: 320, w: 500, h: 160 })
        );
    },

    // Golden hills, full and warm.
    'therapy_unconditional_worth': () => (
        sky('#EBD9B5', '#F6ECD2') +
        sun({ x: 680, y: 440, r: 80, color: '#EFD08E', glow: 0.35, glowColor: '#EBCB84' }) +
        layers({ n: 4, far: '#D3B472', near: '#5A4726', baseTop: 660, baseStep: 90, amp: 50, seed: 361, waves: 1, ampGrow: 1.15 })
    ),

    // Bright spring, puffy clouds, a little tree.
    'therapy_healing_child': () => (
        sky('#BFD8EC', '#E9F2F8') +
        sun({ x: 800, y: 340, r: 62, color: '#FBE49E', glow: 0.35 }) +
        cloud(360, 380, 90, '#FFFFFF') +
        cloud(720, 470, 60, '#FFFFFF') +
        layers({ n: 3, far: '#A9CF8F', near: '#4A7D45', baseTop: 700, baseStep: 100, amp: 50, seed: 381, waves: 1,
            decorate: (i, color, yAt) => (i === 1 ? roundTree(520, yAt(520) + 6, 170, color) : '') })
    ),

    // One mountain, snow on top, nothing else.
    'therapy_quiet_strength': () => (
        sky('#C2CCD6', '#E8ECF0', 0.65) +
        peak({ cx: 600, top: 300, base: 820, halfWidth: 720, snow: 0.3, color: '#6B7A8A', snowColor: '#EAEEF1', seed: 401 }) +
        layers({ n: 2, far: '#8A98A6', near: '#3D4852', baseTop: 820, baseStep: 120, amp: 50, seed: 403, waves: 2 })
    ),
};

// ------------------------------------------------------------------- render

function svgFor(name) {
    const body = SCENES[name]();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

/*
 * A whisper of grain over the flat colour. Smooth gradients band on cheap
 * panels and flat fills can look like a screenshot; a little noise reads as
 * print and hides both. The buffer is seeded so a rebuild is byte-identical.
 */
function grain(seed) {
    const r = rng(seed);
    const buf = Buffer.alloc(W * H);
    for (let i = 0; i < buf.length; i++) buf[i] = 128 + Math.round((r() - 0.5) * 2 * 14);
    return buf;
}

await mkdir(OUT, { recursive: true });
const noise = await sharp(grain(7), { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();

for (const name of Object.keys(SCENES)) {
    const svg = Buffer.from(svgFor(name));
    const out = join(OUT, `${name}.webp`);
    // sharp scales an SVG by density/72, so 72 keeps the raster at exactly
    // W x H and the grain buffer covers it edge to edge.
    await sharp(svg, { density: 72 })
        .composite([{ input: noise, blend: 'overlay' }])
        .webp({ quality: 78, effort: 6 })
        .toFile(out);
    const { size } = await import('node:fs').then((fs) => fs.statSync(out));
    console.log(`${name}.webp  ${(size / 1024).toFixed(0)} KB`);
}
