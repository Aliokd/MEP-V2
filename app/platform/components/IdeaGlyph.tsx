"use client";

import React from 'react';

/**
 * Generative Bauhaus-style artwork for Bank of tips cards.
 *
 * One visual family, after the reference the tips design came from: a large
 * flat accent circle at the back, thin ink line-work through the middle, and a
 * solid ink circle on top. What the line-work IS comes from the tip's category,
 * so the artwork says what kind of tip this is at a glance:
 *
 *   chords → vertical strings        lyrics → a written stanza
 *   melody → a wave with note heads  vibe   → resonance rings
 *
 * Within a category every tip draws its own composition: sizes, positions,
 * counts and the accent colour all come from a PRNG seeded by the tip's id, so
 * the artwork is unique per tip but identical every time that tip is shown.
 * Compositions are constructed to fill the 120-unit box, which is what let the
 * old getBBox measure-and-refit machinery go.
 */

type Rand = () => number;

/** Veinote's palette — near-black ink on the beige card, sage and gold accents. */
const INK = '#1C1917';
const ACCENT_GREEN = '#86BE7F';
const ACCENT_GOLD = '#C5A059';

/** The thin ink stroke the whole family shares. */
const LINE = { stroke: INK, strokeWidth: 1.1 } as const;

function hashSeed(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i += 1) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

/** Small deterministic PRNG — same seed, same drawing, on every render. */
function mulberry32(seed: number): Rand {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Keeps a circle of radius `r` fully inside the box. */
const clampCentre = (v: number, r: number) => Math.min(Math.max(v, r + 2), 118 - r);

/* Layer order in every motif: accent circle (back), ink lines, ink circle
   (front) — the lines run over the colour and vanish under the ink, exactly
   as in the reference. */

function chordsMotif(r: Rand, accent: string): React.ReactElement {
    const count = 6 + Math.floor(r() * 4); // 6–9 strings
    const spacing = 3.6 + r() * 1.2;
    const bandCx = 56 + r() * 10;
    const x0 = bandCx - ((count - 1) * spacing) / 2;

    const aR = 28 + r() * 7;
    const aCx = clampCentre(58 + r() * 14, aR);
    const aCy = clampCentre(74 + r() * 10, aR);

    const dR = 23 + r() * 7;
    const dCx = clampCentre(50 + r() * 16, dR);
    const dCy = clampCentre(36 + r() * 14, dR);

    return (
        <>
            <circle cx={aCx} cy={aCy} r={aR} fill={accent} />
            {Array.from({ length: count }, (_, i) => (
                <line key={i} x1={x0 + i * spacing} y1={4} x2={x0 + i * spacing} y2={116} {...LINE} />
            ))}
            <circle cx={dCx} cy={dCy} r={dR} fill={INK} />
        </>
    );
}

function lyricsMotif(r: Rand, accent: string): React.ReactElement {
    const count = 5 + Math.floor(r() * 3); // 5–7 lines of "text"
    const spacing = 10 + r() * 2.5;
    const top = 60 - ((count - 1) * spacing) / 2;
    const left = 22;
    const widths = Array.from({ length: count }, (_, i) =>
        // the stanza's last line runs short, like a line of verse
        i === count - 1 ? 26 + r() * 16 : 50 + r() * 26,
    );

    const aR = 27 + r() * 7;
    const aCx = clampCentre(76 + r() * 10, aR);
    const aCy = clampCentre(36 + r() * 34, aR);

    const dR = 13 + r() * 5;
    const dCx = 32 + r() * 12;
    const dCy = clampCentre(top - 4 + r() * 20, dR);

    const lastY = top + (count - 1) * spacing;

    return (
        <>
            <circle cx={aCx} cy={aCy} r={aR} fill={accent} />
            {widths.map((w, i) => (
                <line key={i} x1={left} y1={top + i * spacing} x2={left + w} y2={top + i * spacing} {...LINE} />
            ))}
            {/* the stanza's full stop */}
            <circle cx={left + widths[count - 1] + 6} cy={lastY} r={2.4} fill={INK} />
            <circle cx={dCx} cy={dCy} r={dR} fill={INK} />
        </>
    );
}

function melodyMotif(r: Rand, accent: string): React.ReactElement {
    const amp = 16 + r() * 9;
    const baseline = 54 + r() * 12;
    const halfWaves = 2 + Math.floor(r() * 2); // 2–3 half-periods
    const phase = r() * Math.PI * 2;

    const waveY = (x: number) =>
        baseline + amp * Math.sin(phase + ((x - 8) / 104) * halfWaves * Math.PI);
    let d = '';
    for (let x = 8; x <= 112; x += 2) {
        d += `${x === 8 ? 'M' : 'L'}${x} ${waveY(x).toFixed(1)} `;
    }

    // Accent on the left, note head on the right — separated by construction,
    // or the two circles could land near-concentric and read as a target
    // instead of a note travelling through colour.
    const aR = 28 + r() * 7;
    const aCx = clampCentre(34 + r() * 22, aR);
    const aCy = clampCentre(44 + r() * 32, aR);

    // The big ink circle sits ON the wave, like a note head on its staff.
    const dR = 16 + r() * 6;
    const dX = 72 + r() * 18;
    const dCx = clampCentre(dX, dR);
    const dCy = clampCentre(waveY(dX), dR);

    const noteX = 20 + r() * 24;

    return (
        <>
            <circle cx={aCx} cy={aCy} r={aR} fill={accent} />
            <path d={d} fill="none" {...LINE} strokeWidth={1.3} />
            <circle cx={noteX} cy={waveY(noteX)} r={3.2} fill={INK} />
            <circle cx={dCx} cy={dCy} r={dR} fill={INK} />
        </>
    );
}

function vibeMotif(r: Rand, accent: string): React.ReactElement {
    const cx = 54 + r() * 12;
    const cy = 54 + r() * 12;
    const rings = 3 + Math.floor(r() * 2); // 3–4 rings
    const r0 = 13 + r() * 4;
    // The outermost ring reaches as far as the box allows from this centre.
    const maxR = Math.min(cx, cy, 118 - cx, 118 - cy) - 2;
    const step = (maxR - r0) / (rings - 1);

    const side = r() < 0.5 ? -1 : 1;
    const aR = 26 + r() * 7;
    const aCx = clampCentre(cx + side * (26 + r() * 12), aR);
    const aCy = clampCentre(cy + (r() * 40 - 20), aR);

    return (
        <>
            <circle cx={aCx} cy={aCy} r={aR} fill={accent} />
            {Array.from({ length: rings }, (_, i) => (
                <circle key={i} cx={cx} cy={cy} r={r0 + i * step} fill="none" {...LINE} />
            ))}
            <circle cx={cx} cy={cy} r={r0 * 0.62} fill={INK} />
        </>
    );
}

const MOTIFS = {
    lyrics: lyricsMotif,
    melody: melodyMotif,
    chords: chordsMotif,
    vibe: vibeMotif,
} as const;

type MotifKey = keyof typeof MOTIFS;
const MOTIF_KEYS = Object.keys(MOTIFS) as MotifKey[];

interface IdeaGlyphProps {
    /** Tip id — the seed: the same tip always draws the same composition. */
    seed: string;
    /** Bank category; picks the motif. Unknown values fall back by hash. */
    category?: string;
    className?: string;
}

export default function IdeaGlyph({ seed, category, className }: IdeaGlyphProps) {
    const art = React.useMemo(() => {
        const hash = hashSeed(seed);
        const rand = mulberry32(hash);
        const accent = rand() < 0.6 ? ACCENT_GREEN : ACCENT_GOLD;
        const key: MotifKey =
            category && category in MOTIFS
                ? (category as MotifKey)
                : MOTIF_KEYS[hash % MOTIF_KEYS.length];
        return MOTIFS[key](rand, accent);
    }, [seed, category]);

    return (
        <svg
            viewBox="0 0 120 120"
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            aria-hidden="true"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {art}
        </svg>
    );
}
