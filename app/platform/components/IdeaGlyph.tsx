"use client";

import React from 'react';

/**
 * Minimal geometric artwork for Bank of tips cards — one visual set and one
 * accent colour PER CATEGORY, being designed category by category.
 *
 *   chords → the solar-term poster language (hairline rings, stems and staffs,
 *            one solid "sun" per composition) in the brand sage GREEN. Green is
 *            reserved for chords: no other category may use it.
 *
 *   lyrics → Art-Deco letterforms (the striped alphabet reference): circles,
 *            half-circles, triangles and bars, each letter part solid, part
 *            diagonal hatching — in the brand BLUE, reserved for lyrics.
 *
 *   melody → musical notes, unmistakably: quarter/eighth/sixteenth notes,
 *            beamed pairs and runs, half and whole notes, a chord — heads,
 *            flags and beams in the brand PURPLE, reserved for melody.
 *
 *   vibe → flat pattern tiles (the pattern-board reference): dot grids,
 *            zigzags, checkerboards, arcs, stars — one motif per card, half
 *            its elements solid in the brand PINK (reserved for vibe), half
 *            hairline outlines, matching the other sets' balance.
 *
 * Within a set, each tip is mapped onto one drawing by a hash of its id: the
 * pairing is arbitrary but stable, so a given tip always shows the same picture
 * no matter how the deck is filtered or ordered.
 *
 * Strokes use `currentColor`, so the line tone comes from the parent's text
 * class; only the accent fills are the component's own.
 */

/** Paint effects a set may draw with, as fill urls into this instance's own
 *  <defs>. Today only lyrics uses one — the diagonal stripe `hatch`. */
interface Fx {
    hatch: string;
}

type Glyph = (accent: string, fx: Fx) => React.ReactElement;

/** A solid accent circle — the "sun" of a solar composition. */
const Sun = ({ cx, cy, r, a }: { cx: number; cy: number; r: number; a: string }) => (
    <circle cx={cx} cy={cy} r={r} fill={a} stroke="none" />
);

/** The lens where two rings overlap, filled — close enough to the true vesica. */
const Lens = ({ cx, cy, a }: { cx: number; cy: number; a: string }) => (
    <ellipse cx={cx} cy={cy} rx={4.2} ry={7.5} fill={a} stroke="none" />
);

/* ------------------------------------------------------------------ */
/* Chords — the solar-term set.                                        */
/* ------------------------------------------------------------------ */

const SOLAR_GLYPHS: Glyph[] = [
    // 1 — sun over a ring, threaded on a line
    (a) => (
        <>
            <line x1="60" y1="40" x2="60" y2="89" />
            <Sun cx={60} cy={40} r={17} a={a} />
            <circle cx="60" cy="72" r="17" />
        </>
    ),
    // 2 — sun with rain falling
    (a) => (
        <>
            <Sun cx={46} cy={38} r={15} a={a} />
            <circle cx="63" cy="50" r="10" />
            <line x1="50" y1="60" x2="50" y2="96" />
            <line x1="58" y1="60" x2="58" y2="86" />
            <line x1="66" y1="60" x2="66" y2="96" />
            <line x1="74" y1="60" x2="74" y2="84" />
        </>
    ),
    // 3 — sprouts on a baseline
    (a) => (
        <>
            <line x1="28" y1="80" x2="92" y2="80" />
            <line x1="38" y1="80" x2="38" y2="58" />
            <line x1="56" y1="80" x2="56" y2="50" />
            <line x1="74" y1="80" x2="74" y2="62" />
            <Sun cx={38} cy={54} r={5.5} a={a} />
            <Sun cx={56} cy={45} r={6.5} a={a} />
            <circle cx="74" cy="57" r="5.5" />
        </>
    ),
    // 4 — half circle under a hatched sky
    (a) => (
        <>
            <line x1="30" y1="78" x2="74" y2="26" />
            <line x1="38" y1="88" x2="86" y2="30" />
            <line x1="52" y1="94" x2="96" y2="40" />
            <circle cx="60" cy="60" r="20" />
            <path d="M40,60 A20,20 0 0 1 80,60 Z" fill={a} stroke="none" />
        </>
    ),
    // 5 — hanging beads
    (a) => (
        <>
            <line x1="40" y1="28" x2="40" y2="84" />
            <line x1="56" y1="28" x2="56" y2="70" />
            <line x1="72" y1="28" x2="72" y2="92" />
            <line x1="88" y1="28" x2="88" y2="62" />
            <Sun cx={40} cy={48} r={4.5} a={a} />
            <circle cx="40" cy="66" r="4" />
            <circle cx="56" cy="40" r="4" />
            <Sun cx={56} cy={58} r={5} a={a} />
            <Sun cx={72} cy={52} r={4} a={a} />
            <circle cx="72" cy="74" r="4.5" />
            <Sun cx={88} cy={44} r={4} a={a} />
        </>
    ),
    // 6 — sun over beads resting on staff lines
    (a) => (
        <>
            <Sun cx={68} cy={36} r={14} a={a} />
            <line x1="28" y1="64" x2="92" y2="64" />
            <line x1="28" y1="76" x2="92" y2="76" />
            <line x1="34" y1="88" x2="86" y2="88" />
            <circle cx="42" cy="64" r="5" />
            <Sun cx={60} cy={76} r={4.5} a={a} />
            <circle cx="74" cy="88" r="4" />
        </>
    ),
    // 7 — diagonal chain
    (a) => (
        <>
            <circle cx="32" cy="36" r="5" />
            <Sun cx={44} cy={46} r={7} a={a} />
            <Sun cx={55} cy={53} r={4} a={a} />
            <circle cx="64" cy="62" r="8" />
            <Sun cx={76} cy={72} r={5.5} a={a} />
            <circle cx="87" cy="80" r="4" />
        </>
    ),
    // 8 — lenses in circle pairs
    (a) => (
        <>
            <circle cx="42" cy="42" r="10" />
            <circle cx="56" cy="42" r="10" />
            <Lens cx={49} cy={42} a={a} />
            <circle cx="64" cy="62" r="10" />
            <circle cx="78" cy="62" r="10" />
            <Lens cx={71} cy={62} a={a} />
            <circle cx="38" cy="74" r="10" />
            <circle cx="52" cy="74" r="10" />
            <Lens cx={45} cy={74} a={a} />
        </>
    ),
    // 9 — comet with trails
    (a) => (
        <>
            <Sun cx={54} cy={44} r={15} a={a} />
            <line x1="46" y1="58" x2="24" y2="84" />
            <line x1="54" y1="60" x2="34" y2="90" />
            <line x1="62" y1="58" x2="46" y2="92" />
            <circle cx="74" cy="66" r="9" />
            <line x1="68" y1="74" x2="56" y2="88" />
        </>
    ),
    // 10 — dew: dots over a row of rings
    (a) => (
        <>
            <circle cx="38" cy="74" r="9" />
            <circle cx="52" cy="74" r="9" />
            <circle cx="66" cy="74" r="9" />
            <circle cx="80" cy="74" r="9" />
            <Sun cx={42} cy={44} r={3} a={a} />
            <Sun cx={54} cy={38} r={3} a={a} />
            <Sun cx={66} cy={46} r={3} a={a} />
            <Sun cx={78} cy={40} r={3} a={a} />
            <Sun cx={60} cy={52} r={3} a={a} />
        </>
    ),
    // 11 — equinox: half-filled circle on a meridian
    (a) => (
        <>
            <line x1="60" y1="24" x2="60" y2="96" />
            <circle cx="60" cy="60" r="18" />
            <path d="M60,42 A18,18 0 0 0 60,78 Z" fill={a} stroke="none" />
            <Sun cx={84} cy={46} r={4} a={a} />
            <circle cx="40" cy="80" r="3.5" />
        </>
    ),
    // 12 — beads sinking into a pool
    (a) => (
        <>
            <line x1="60" y1="26" x2="60" y2="70" />
            <Sun cx={60} cy={30} r={3} a={a} />
            <Sun cx={60} cy={42} r={4} a={a} />
            <Sun cx={60} cy={55} r={5} a={a} />
            <circle cx="60" cy="84" r="14" />
            <Sun cx={60} cy={84} r={5} a={a} />
        </>
    ),
    // 13 — solstice: sun tied to a ring
    (a) => (
        <>
            <line x1="74" y1="42" x2="48" y2="76" />
            <Sun cx={74} cy={42} r={16} a={a} />
            <circle cx="48" cy="76" r="16" />
        </>
    ),
    // 14 — rack: rings on a rail, suns hung below
    (a) => (
        <>
            <line x1="26" y1="38" x2="94" y2="38" />
            <circle cx="34" cy="38" r="7" />
            <circle cx="50" cy="38" r="7" />
            <circle cx="66" cy="38" r="7" />
            <circle cx="82" cy="38" r="7" />
            <Sun cx={42} cy={56} r={7} a={a} />
            <Sun cx={74} cy={56} r={7} a={a} />
            <Sun cx={58} cy={68} r={7} a={a} />
        </>
    ),
    // 15 — wind: circles with speed lines
    (a) => (
        <>
            <Sun cx={38} cy={40} r={6.5} a={a} />
            <line x1="46" y1="38" x2="80" y2="38" />
            <line x1="46" y1="43" x2="72" y2="43" />
            <circle cx="62" cy="58" r="7" />
            <line x1="71" y1="56" x2="96" y2="56" />
            <line x1="71" y1="61" x2="88" y2="61" />
            <Sun cx={46} cy={76} r={7.5} a={a} />
            <line x1="55" y1="74" x2="88" y2="74" />
            <line x1="55" y1="79" x2="78" y2="79" />
        </>
    ),
    // 16 — half sun on the horizon
    (a) => (
        <>
            <line x1="26" y1="70" x2="94" y2="70" />
            <path d="M43,70 A17,17 0 0 1 77,70 Z" fill={a} stroke="none" />
            <circle cx="44" cy="81" r="4.5" />
            <Sun cx={74} cy={82} r={4} a={a} />
        </>
    ),
];

/* ------------------------------------------------------------------ */
/* Lyrics — Art-Deco letterforms.                                      */
/* Each letter is part solid (the set's blue), part diagonal hatching, */
/* exactly as the striped-alphabet reference builds its glyphs.        */
/* ------------------------------------------------------------------ */

const LYRIC_GLYPHS: Glyph[] = [
    // A — hatched triangle, solid crossbar
    (a, { hatch }) => (
        <>
            <polygon points="60,26 90,92 30,92" fill={hatch} stroke="none" />
            <polygon points="46,74 74,74 81,90 39,90" fill={a} stroke="none" />
        </>
    ),
    // B — solid stem, two hatched bowls
    (a, { hatch }) => (
        <>
            <rect x="34" y="28" width="12" height="64" fill={a} stroke="none" />
            <path d="M46,28 A16,16 0 0 1 46,60 Z" fill={hatch} stroke="none" />
            <path d="M46,60 A16,16 0 0 1 46,92 Z" fill={hatch} stroke="none" />
        </>
    ),
    // C — hatched disc, solid quarter
    (a, { hatch }) => (
        <>
            <circle cx="60" cy="60" r="32" fill={hatch} stroke="none" />
            <path d="M60,60 L60,28 A32,32 0 0 1 92,60 Z" fill={a} stroke="none" />
        </>
    ),
    // D — solid stem, hatched bowl
    (a, { hatch }) => (
        <>
            <rect x="36" y="28" width="12" height="64" fill={a} stroke="none" />
            <path d="M48,28 A32,32 0 0 1 48,92 Z" fill={hatch} stroke="none" />
        </>
    ),
    // E — hatched block, solid bars
    (a, { hatch }) => (
        <>
            <rect x="34" y="28" width="52" height="64" fill={hatch} stroke="none" />
            <rect x="34" y="28" width="52" height="12" fill={a} stroke="none" />
            <rect x="34" y="54" width="42" height="12" fill={a} stroke="none" />
            <rect x="34" y="80" width="52" height="12" fill={a} stroke="none" />
        </>
    ),
    // G — hatched disc, solid bar into the centre
    (a, { hatch }) => (
        <>
            <circle cx="60" cy="60" r="32" fill={hatch} stroke="none" />
            <rect x="60" y="54" width="30" height="14" fill={a} stroke="none" />
        </>
    ),
    // H — hatched stems, solid crossbar
    (a, { hatch }) => (
        <>
            <rect x="34" y="28" width="14" height="64" fill={hatch} stroke="none" />
            <rect x="72" y="28" width="14" height="64" fill={hatch} stroke="none" />
            <rect x="48" y="54" width="24" height="12" fill={a} stroke="none" />
        </>
    ),
    // i — solid dot over a hatched stem
    (a, { hatch }) => (
        <>
            <circle cx="60" cy="36" r="9" fill={a} stroke="none" />
            <rect x="51" y="50" width="18" height="42" fill={hatch} stroke="none" />
        </>
    ),
    // J — hatched stem, solid hook
    (a, { hatch }) => (
        <>
            <rect x="63" y="28" width="14" height="38" fill={hatch} stroke="none" />
            <path d="M78,66 A19,19 0 0 1 40,66 Z" fill={a} stroke="none" />
        </>
    ),
    // K — solid stem, hatched wedges
    (a, { hatch }) => (
        <>
            <rect x="36" y="28" width="12" height="64" fill={a} stroke="none" />
            <polygon points="50,58 86,28 86,48" fill={hatch} stroke="none" />
            <polygon points="50,62 86,92 86,72" fill={hatch} stroke="none" />
        </>
    ),
    // L — hatched stem, solid foot
    (a, { hatch }) => (
        <>
            <rect x="40" y="28" width="14" height="52" fill={hatch} stroke="none" />
            <rect x="40" y="80" width="46" height="12" fill={a} stroke="none" />
        </>
    ),
    // O — half hatched, half solid
    (a, { hatch }) => (
        <>
            <path d="M60,28 A32,32 0 0 0 60,92 Z" fill={hatch} stroke="none" />
            <path d="M60,28 A32,32 0 0 1 60,92 Z" fill={a} stroke="none" />
        </>
    ),
    // P — solid stem, hatched bowl
    (a, { hatch }) => (
        <>
            <rect x="36" y="28" width="12" height="64" fill={a} stroke="none" />
            <path d="M48,28 A17,17 0 0 1 48,62 Z" fill={hatch} stroke="none" />
        </>
    ),
    // 8 — hatched top, solid bottom
    (a, { hatch }) => (
        <>
            <circle cx="60" cy="44" r="16" fill={hatch} stroke="none" />
            <circle cx="60" cy="77" r="16" fill={a} stroke="none" />
        </>
    ),
    // T — solid cap, hatched stem
    (a, { hatch }) => (
        <>
            <rect x="30" y="28" width="60" height="12" fill={a} stroke="none" />
            <rect x="53" y="40" width="14" height="52" fill={hatch} stroke="none" />
        </>
    ),
    // U — hatched stems, solid bowl
    (a, { hatch }) => (
        <>
            <rect x="38" y="28" width="12" height="38" fill={hatch} stroke="none" />
            <rect x="70" y="28" width="12" height="38" fill={hatch} stroke="none" />
            <path d="M82,64 A22,22 0 0 1 38,64 Z" fill={a} stroke="none" />
        </>
    ),
];

/* ------------------------------------------------------------------ */
/* Melody — musical notes, unmistakably.                               */
/* Real notation figures: quarter/eighth/sixteenth notes, beamed pairs */
/* and runs, half and whole notes, a chord, notes on staff lines.      */
/* Heads, flags, beams and dots in the set's purple; stems and staff   */
/* lines hairline currentColor.                                        */
/* ------------------------------------------------------------------ */

/** A note head — filled, tilted like real notation. */
const Head = ({ cx, cy, a, rx = 8, ry = 5.5 }: { cx: number; cy: number; a: string; rx?: number; ry?: number }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-18 ${cx} ${cy})`} fill={a} stroke="none" />
);

/** A hollow head, for half and whole notes. */
const HollowHead = ({ cx, cy, a, rx = 8, ry = 5.5, w = 3.4 }: { cx: number; cy: number; a: string; rx?: number; ry?: number; w?: number }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-18 ${cx} ${cy})`} fill="none" stroke={a} strokeWidth={w} />
);

/** A beam between two stem tops. */
const Beam = ({ x1, y1, x2, y2, a, t = 5.5 }: { x1: number; y1: number; x2: number; y2: number; a: string; t?: number }) => (
    <polygon points={`${x1},${y1} ${x2},${y2} ${x2},${y2 + t} ${x1},${y1 + t}`} fill={a} stroke="none" />
);

/** Hairline staff lines. */
const Staff = ({ y0, x1 = 26, x2 = 94, n = 5, step = 8 }: { y0: number; x1?: number; x2?: number; n?: number; step?: number }) => (
    <>
        {Array.from({ length: n }, (_, i) => (
            <line key={i} x1={x1} y1={y0 + i * step} x2={x2} y2={y0 + i * step} />
        ))}
    </>
);

const MELODY_GLYPHS: Glyph[] = [
    // 1 — quarter note
    (a) => (
        <>
            <Head cx={52} cy={78} a={a} />
            <line x1="59.5" y1="76" x2="59.5" y2="32" />
        </>
    ),
    // 2 — eighth note
    (a) => (
        <>
            <Head cx={48} cy={78} a={a} />
            <line x1="55.5" y1="76" x2="55.5" y2="30" />
            <path d="M55.5,30 C69.5,37 71.5,47 63.5,60 C67.5,49 64.5,41 55.5,36 Z" fill={a} stroke="none" />
        </>
    ),
    // 3 — sixteenth note
    (a) => (
        <>
            <Head cx={48} cy={80} a={a} />
            <line x1="55.5" y1="78" x2="55.5" y2="28" />
            <path d="M55.5,28 C69.5,35 71.5,45 63.5,58 C67.5,47 64.5,39 55.5,34 Z" fill={a} stroke="none" />
            <path d="M55.5,40 C69.5,47 71.5,57 63.5,70 C67.5,59 64.5,51 55.5,46 Z" fill={a} stroke="none" />
        </>
    ),
    // 4 — beamed eighth pair
    (a) => (
        <>
            <Head cx={38} cy={80} a={a} />
            <line x1="45.5" y1="78" x2="45.5" y2="34" />
            <Head cx={72} cy={72} a={a} />
            <line x1="79.5" y1="70" x2="79.5" y2="26" />
            <Beam x1={45.5} y1={34} x2={79.5} y2={26} a={a} />
        </>
    ),
    // 5 — beamed sixteenth pair
    (a) => (
        <>
            <Head cx={38} cy={82} a={a} />
            <line x1="45.5" y1="80" x2="45.5" y2="34" />
            <Head cx={72} cy={82} a={a} />
            <line x1="79.5" y1="80" x2="79.5" y2="34" />
            <Beam x1={45.5} y1={34} x2={79.5} y2={34} a={a} />
            <Beam x1={45.5} y1={44} x2={79.5} y2={44} a={a} />
        </>
    ),
    // 6 — three beamed eighths, descending
    (a) => (
        <>
            <Head cx={30} cy={70} a={a} />
            <line x1="37.5" y1="68" x2="37.5" y2="30" />
            <Head cx={54} cy={78} a={a} />
            <line x1="61.5" y1="76" x2="61.5" y2="34" />
            <Head cx={78} cy={86} a={a} />
            <line x1="85.5" y1="84" x2="85.5" y2="38" />
            <Beam x1={37.5} y1={30} x2={85.5} y2={38} a={a} />
        </>
    ),
    // 7 — beamed pair on a staff
    (a) => (
        <>
            <Staff y0={40} />
            <Head cx={46} cy={64} a={a} />
            <line x1="53.5" y1="62" x2="53.5" y2="26" />
            <Head cx={74} cy={56} a={a} />
            <line x1="81.5" y1="54" x2="81.5" y2="22" />
            <Beam x1={53.5} y1={26} x2={81.5} y2={22} a={a} />
        </>
    ),
    // 8 — quarter note on a staff
    (a) => (
        <>
            <Staff y0={40} />
            <Head cx={56} cy={56} a={a} />
            <line x1="63.5" y1="54" x2="63.5" y2="22" />
        </>
    ),
    // 9 — half note
    (a) => (
        <>
            <HollowHead cx={52} cy={78} a={a} />
            <line x1="59.5" y1="76" x2="59.5" y2="32" />
        </>
    ),
    // 10 — whole note
    (a) => <HollowHead cx={60} cy={60} a={a} rx={13} ry={9} w={4.2} />,
    // 11 — beamed pair, ascending
    (a) => (
        <>
            <Head cx={38} cy={88} a={a} />
            <line x1="45.5" y1="86" x2="45.5" y2="42" />
            <Head cx={72} cy={72} a={a} />
            <line x1="79.5" y1="70" x2="79.5" y2="28" />
            <Beam x1={45.5} y1={42} x2={79.5} y2={28} a={a} />
        </>
    ),
    // 12 — dotted quarter
    (a) => (
        <>
            <Head cx={48} cy={76} a={a} />
            <line x1="55.5" y1="74" x2="55.5" y2="30" />
            <circle cx="67" cy="74" r="3.4" fill={a} stroke="none" />
        </>
    ),
    // 13 — chord: a third on one stem
    (a) => (
        <>
            <Head cx={50} cy={80} a={a} />
            <Head cx={50} cy={66} a={a} />
            <line x1="57.5" y1="78" x2="57.5" y2="28" />
        </>
    ),
    // 14 — three beamed sixteenths, ascending
    (a) => (
        <>
            <Head cx={30} cy={84} a={a} />
            <line x1="37.5" y1="82" x2="37.5" y2="38" />
            <Head cx={54} cy={78} a={a} />
            <line x1="61.5" y1="76" x2="61.5" y2="34" />
            <Head cx={78} cy={70} a={a} />
            <line x1="85.5" y1="68" x2="85.5" y2="30" />
            <Beam x1={37.5} y1={38} x2={85.5} y2={30} a={a} />
            <Beam x1={37.5} y1={47} x2={85.5} y2={39} a={a} />
        </>
    ),
    // 15 — one large eighth note
    (a) => (
        <>
            <Head cx={50} cy={82} a={a} rx={11} ry={8} />
            <line x1="60.5" y1="79" x2="60.5" y2="24" />
            <path d="M60.5,24 C74.5,31 76.5,41 68.5,54 C72.5,43 69.5,35 60.5,30 Z" fill={a} stroke="none" />
        </>
    ),
    // 16 — eighth pair over a short staff
    (a) => (
        <>
            <Staff y0={64} x1={34} x2={86} n={3} />
            <Head cx={44} cy={72} a={a} />
            <line x1="51.5" y1="70" x2="51.5" y2="30" />
            <Head cx={70} cy={64} a={a} />
            <line x1="77.5" y1="62" x2="77.5" y2="26" />
            <Beam x1={51.5} y1={30} x2={77.5} y2={26} a={a} />
        </>
    ),
];

/* ------------------------------------------------------------------ */
/* Vibe — flat pattern tiles.                                          */
/* One repeating-pattern motif per card — dot grids, zigzags, teeth,   */
/* checkerboards, arcs, stars. Roughly HALF of every tile's elements   */
/* are solid pink and half are hairline grey outlines (bare elements   */
/* inheriting the root's currentColor stroke), so vibe carries the     */
/* same fill-to-line balance as the other three sets.                  */
/* ------------------------------------------------------------------ */

/** Points for an N-spike star, used by the starburst tile. */
function starPoints(cx: number, cy: number, rOut: number, rIn: number, spikes = 8): string {
    return Array.from({ length: spikes * 2 }, (_, i) => {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = (i * Math.PI) / spikes - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
}

const GRID_XS = [34, 52, 70, 88];

const VIBE_GLYPHS: Glyph[] = [
    // 1 — dot grid, solids and rings alternating like a checker
    (a) => (
        <>
            {GRID_XS.map((x, ix) =>
                GRID_XS.map((y, iy) =>
                    (ix + iy) % 2 === 0 ? (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill={a} stroke="none" />
                    ) : (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" />
                    ),
                ),
            )}
        </>
    ),
    // 2 — zigzag rows: pink / hairline / pink
    (a) => (
        <>
            <path d="M26,36 L37,26 L48,36 L59,26 L70,36 L81,26 L92,36" fill="none" stroke={a} strokeWidth="6" />
            <path d="M26,64 L37,54 L48,64 L59,54 L70,64 L81,54 L92,64" />
            <path d="M26,92 L37,82 L48,92 L59,82 L70,92 L81,82 L92,92" fill="none" stroke={a} strokeWidth="6" />
        </>
    ),
    // 3 — triangle teeth, alternating per tooth and offset per row
    (a) => (
        <>
            {[0, 1, 2, 3].map(i => {
                const pts = `${28 + i * 17},58 ${36.5 + i * 17},38 ${45 + i * 17},58`;
                return i % 2 === 0 ? (
                    <polygon key={`t${i}`} points={pts} fill={a} stroke="none" />
                ) : (
                    <polygon key={`t${i}`} points={pts} />
                );
            })}
            {[0, 1, 2, 3].map(i => {
                const pts = `${28 + i * 17},88 ${36.5 + i * 17},68 ${45 + i * 17},88`;
                return i % 2 === 1 ? (
                    <polygon key={`b${i}`} points={pts} fill={a} stroke="none" />
                ) : (
                    <polygon key={`b${i}`} points={pts} />
                );
            })}
        </>
    ),
    // 4 — checkerboard: solid rows and outlined rows
    (a) => (
        <>
            {[0, 1, 2, 3].map(r =>
                [0, 1, 2, 3]
                    .filter(c => (r + c) % 2 === 0)
                    .map(c =>
                        r % 2 === 0 ? (
                            <rect key={`${r}-${c}`} x={26 + c * 17} y={26 + r * 17} width="17" height="17" fill={a} stroke="none" />
                        ) : (
                            <rect key={`${r}-${c}`} x={26 + c * 17} y={26 + r * 17} width="17" height="17" />
                        ),
                    ),
            )}
        </>
    ),
    // 5 — diagonal stripes, alternating solid and outlined bars
    (a) => (
        <g transform="rotate(-45 60 60)">
            <rect x="28" y="32" width="64" height="8" rx="4" fill={a} stroke="none" />
            <rect x="28" y="48" width="64" height="8" rx="4" />
            <rect x="28" y="64" width="64" height="8" rx="4" fill={a} stroke="none" />
            <rect x="28" y="80" width="64" height="8" rx="4" />
        </g>
    ),
    // 6 — quarter arcs, thick pink and hairline alternating
    (a) => (
        <>
            <path d="M46,94 A20,20 0 0 0 26,74" fill="none" stroke={a} strokeWidth="8" />
            <path d="M62,94 A36,36 0 0 0 26,58" />
            <path d="M78,94 A52,52 0 0 0 26,42" fill="none" stroke={a} strokeWidth="8" />
            <path d="M94,94 A68,68 0 0 0 26,26" />
        </>
    ),
    // 7 — quatrefoil: diagonal pair solid, diagonal pair outlined
    (a) => (
        <>
            <circle cx="45" cy="45" r="15" fill={a} stroke="none" />
            <circle cx="75" cy="45" r="15" />
            <circle cx="45" cy="75" r="15" />
            <circle cx="75" cy="75" r="15" fill={a} stroke="none" />
        </>
    ),
    // 8 — bowtie: one solid wing, one outlined
    (a) => (
        <>
            <polygon points="30,34 58,60 30,86" fill={a} stroke="none" />
            <polygon points="90,34 62,60 90,86" />
        </>
    ),
    // 9 — scallop rows, alternating
    (a) => (
        <>
            <path d="M26,58 A11,11 0 0 1 48,58 Z" fill={a} stroke="none" />
            <path d="M49,58 A11,11 0 0 1 71,58 Z" />
            <path d="M72,58 A11,11 0 0 1 94,58 Z" fill={a} stroke="none" />
            <path d="M26,90 A11,11 0 0 1 48,90 Z" />
            <path d="M49,90 A11,11 0 0 1 71,90 Z" fill={a} stroke="none" />
            <path d="M72,90 A11,11 0 0 1 94,90 Z" />
        </>
    ),
    // 10 — rising bars, the middle one outlined
    (a) => (
        <>
            <rect x="26" y="62" width="22" height="32" fill={a} stroke="none" />
            <rect x="49" y="44" width="22" height="50" />
            <rect x="72" y="26" width="22" height="68" fill={a} stroke="none" />
        </>
    ),
    // 11 — plus: outlined large, solid small inside
    (a) => (
        <>
            <path d="M47,28 L73,28 L73,47 L92,47 L92,73 L73,73 L73,92 L47,92 L47,73 L28,73 L28,47 L47,47 Z" />
            <g transform="translate(60 60) scale(0.5) translate(-60 -60)">
                <path d="M47,28 L73,28 L73,47 L92,47 L92,73 L73,73 L73,92 L47,92 L47,73 L28,73 L28,47 L47,47 Z" fill={a} stroke="none" />
            </g>
        </>
    ),
    // 12 — diamond quartet, diagonal split
    (a) => (
        <>
            <polygon points="43,28 58,43 43,58 28,43" fill={a} stroke="none" />
            <polygon points="77,28 92,43 77,58 62,43" />
            <polygon points="43,62 58,77 43,92 28,77" />
            <polygon points="77,62 92,77 77,92 62,77" fill={a} stroke="none" />
        </>
    ),
    // 13 — wave rows: hairline / pink / hairline
    (a) => (
        <>
            <path d="M26,40 Q34.5,30 43,40 T60,40 T77,40 T94,40" />
            <path d="M26,62 Q34.5,52 43,62 T60,62 T77,62 T94,62" fill="none" stroke={a} strokeWidth="6" />
            <path d="M26,84 Q34.5,74 43,84 T60,84 T77,84 T94,84" />
        </>
    ),
    // 14 — X: a solid bar crossing an outlined one
    (a) => (
        <>
            <polygon points="86,26 94,34 34,94 26,86" />
            <polygon points="26,34 34,26 94,86 86,94" fill={a} stroke="none" />
        </>
    ),
    // 15 — star: an outlined star holding a solid one
    (a) => (
        <>
            <polygon points={starPoints(60, 60, 34, 15)} />
            <polygon points={starPoints(60, 60, 19, 8.5)} fill={a} stroke="none" />
        </>
    ),
    // 16 — pinwheel, alternating blades
    (a) => (
        <>
            <polygon points="60,60 60,26 94,26" fill={a} stroke="none" />
            <polygon points="60,60 94,60 94,94" />
            <polygon points="60,60 60,94 26,94" fill={a} stroke="none" />
            <polygon points="60,60 26,60 26,26" />
        </>
    ),
];

/* ------------------------------------------------------------------ */
/* Interim set for the categories not yet designed.                    */
/* The earlier hairline geometric drawings; their accent dots wear the */
/* set's own colour (gold), never chords' green.                       */
/* ------------------------------------------------------------------ */

/** Points for a regular polygon, used by the hexagon glyph. */
function polygonPoints(sides: number, radius: number, cx = 60, cy = 60, rotation = -90): string {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((360 / sides) * i + rotation) * (Math.PI / 180);
        return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
}

const CLASSIC_GLYPHS: Glyph[] = [
    // 1 — nested diamond and squares
    () => (
        <>
            <rect x="24" y="24" width="72" height="72" transform="rotate(45 60 60)" />
            <rect x="30" y="30" width="60" height="60" />
            <rect x="42" y="42" width="36" height="36" transform="rotate(45 60 60)" />
            <rect x="48" y="48" width="24" height="24" />
        </>
    ),
    // 2 — three overlapping circles
    () => (
        <>
            <circle cx="60" cy="44" r="24" />
            <circle cx="46" cy="70" r="24" />
            <circle cx="74" cy="70" r="24" />
        </>
    ),
    // 3 — four overlapping circles
    () => (
        <>
            <circle cx="46" cy="46" r="24" />
            <circle cx="74" cy="46" r="24" />
            <circle cx="46" cy="74" r="24" />
            <circle cx="74" cy="74" r="24" />
        </>
    ),
    // 4 — circles nesting downward
    () => (
        <>
            <circle cx="60" cy="52" r="36" />
            <circle cx="60" cy="62" r="26" />
            <circle cx="60" cy="72" r="16" />
            <circle cx="60" cy="80" r="8" />
        </>
    ),
    // 5 — star lattice over a standing bar
    () => (
        <>
            <rect x="48" y="20" width="24" height="80" />
            <rect x="30" y="42" width="60" height="36" transform="rotate(30 60 60)" />
            <rect x="30" y="42" width="60" height="36" transform="rotate(-30 60 60)" />
            <rect x="30" y="42" width="60" height="36" transform="rotate(90 60 60)" />
        </>
    ),
    // 6 — fan spraying from a point
    () => (
        <>
            <path d="M22 60 C 52 60, 74 40, 96 24" />
            <path d="M22 60 C 52 60, 78 46, 98 36" />
            <path d="M22 60 C 52 60, 80 54, 100 50" />
            <path d="M22 60 C 52 60, 80 64, 100 70" />
            <path d="M22 60 C 52 60, 78 74, 98 84" />
            <path d="M22 60 C 52 60, 74 80, 96 96" />
            <circle cx="22" cy="60" r="2" fill="currentColor" />
        </>
    ),
    // 7 — ring with a small satellite
    () => (
        <>
            <circle cx="58" cy="64" r="32" />
            <circle cx="58" cy="64" r="16" />
            <circle cx="90" cy="32" r="7" />
        </>
    ),
    // 8 — molecule of linked nodes
    () => (
        <>
            <path d="M32 44 L 54 58 L 76 44 L 92 62" />
            <path d="M54 58 L 58 82" />
            <circle cx="30" cy="42" r="8" />
            <circle cx="56" cy="60" r="8" />
            <circle cx="78" cy="42" r="8" />
            <circle cx="94" cy="64" r="8" />
            <circle cx="58" cy="86" r="8" />
        </>
    ),
    // 9 — radial burst
    () => (
        <>
            {Array.from({ length: 28 }).map((_, i) => {
                const ang = (i * (360 / 28)) * (Math.PI / 180);
                const inner = i % 2 === 0 ? 16 : 22;
                const outer = i % 2 === 0 ? 40 : 34;
                return (
                    <line
                        key={i}
                        x1={(60 + inner * Math.cos(ang)).toFixed(2)}
                        y1={(60 + inner * Math.sin(ang)).toFixed(2)}
                        x2={(60 + outer * Math.cos(ang)).toFixed(2)}
                        y2={(60 + outer * Math.sin(ang)).toFixed(2)}
                    />
                );
            })}
        </>
    ),
    // 10 — looping wave threaded with nodes
    () => (
        <>
            <path d="M24 78 C 30 40, 56 34, 60 60 C 64 86, 90 80, 96 44" />
            <circle cx="24" cy="78" r="4" />
            <circle cx="46" cy="44" r="4" />
            <circle cx="60" cy="60" r="4" />
            <circle cx="76" cy="80" r="4" />
            <circle cx="96" cy="44" r="4" />
        </>
    ),
    // 11 — crop marks framing an ellipse
    () => (
        <>
            <path d="M28 44 L 28 28 L 44 28" />
            <path d="M92 76 L 92 92 L 76 92" />
            <ellipse cx="60" cy="60" rx="26" ry="18" transform="rotate(-35 60 60)" />
            <line x1="60" y1="22" x2="60" y2="98" />
            <line x1="22" y1="66" x2="98" y2="66" />
        </>
    ),
    // 12 — stacked layers
    () => (
        <>
            {[0, 1, 2, 3].map(i => {
                const y = 36 + i * 16;
                return (
                    <polygon key={i} points={`60,${y - 12} 96,${y} 60,${y + 12} 24,${y}`} />
                );
            })}
        </>
    ),
    // 13 — plotted square with accent points
    (a) => (
        <>
            <rect x="24" y="24" width="72" height="72" />
            <circle cx="60" cy="60" r="20" strokeDasharray="3 4" />
            <line x1="24" y1="24" x2="96" y2="96" strokeDasharray="3 4" />
            <line x1="96" y1="24" x2="24" y2="96" strokeDasharray="3 4" />
            <circle cx="60" cy="60" r="3.5" fill={a} stroke="none" />
            <circle cx="76" cy="60" r="3" fill={a} stroke="none" />
        </>
    ),
    // 14 — nested orbits
    (a) => (
        <>
            <circle cx="60" cy="60" r="36" />
            <circle cx="58" cy="62" r="24" strokeDasharray="3 4" />
            <circle cx="56" cy="64" r="14" strokeDasharray="3 4" />
            <circle cx="56" cy="64" r="6" />
            <circle cx="56" cy="64" r="3" fill={a} stroke="none" />
            <circle cx="72" cy="80" r="3" fill={a} stroke="none" />
        </>
    ),
    // 15 — sphere crossed by arcs
    (a) => (
        <>
            <circle cx="60" cy="60" r="36" />
            <path d="M28 44 C 48 68, 72 84, 94 78" strokeDasharray="3 4" />
            <path d="M34 84 C 54 60, 76 42, 92 40" />
            <circle cx="72" cy="46" r="3.5" fill={a} stroke="none" />
            <circle cx="54" cy="72" r="3" fill={a} stroke="none" />
        </>
    ),
    // 16 — nested hexagons
    (a) => (
        <>
            <polygon points={polygonPoints(6, 38)} />
            <polygon points={polygonPoints(6, 24)} />
            <circle cx="60" cy="60" r="12" strokeDasharray="3 4" />
            <line x1="60" y1="36" x2="60" y2="60" />
            <circle cx="60" cy="60" r="3" fill={a} stroke="none" />
        </>
    ),
];

/* ------------------------------------------------------------------ */

interface GlyphSet {
    glyphs: Glyph[];
    accent: string;
    /** How much of the 120-unit box this set's drawings fill (default 114). */
    fillTarget?: number;
}

/** One entry per designed category; the rest run on the interim set. */
const SETS: Record<string, GlyphSet> = {
    /** GREEN belongs to chords — no other set may claim it. */
    chords: { glyphs: SOLAR_GLYPHS, accent: '#86BE7F' },
    /** BLUE belongs to lyrics — the celebration gradient's blue, the one that
     *  sits beside chords' sage in the brand's own ramp. */
    lyrics: { glyphs: LYRIC_GLYPHS, accent: '#8EC9F0' },
    /** PURPLE belongs to melody — next along the same gradient. */
    melody: { glyphs: MELODY_GLYPHS, accent: '#B79DF0' },
    /** PINK belongs to vibe — the ramp's last colour, so the four
     *  categories are exactly the Mind Power celebration gradient.
 */
    vibe: { glyphs: VIBE_GLYPHS, accent: '#F0A8C9' },
};

/** Fallback for a tip with a missing or unknown category — gold, never one of
 *  the four reserved colours. */
const INTERIM_SET: GlyphSet = { glyphs: CLASSIC_GLYPHS, accent: '#C5A059' };

/** Stable, order-independent mapping from a tip id onto one of a set's glyphs. */
function glyphIndexFor(seed: string, count: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % count;
}

interface IdeaGlyphProps {
    /** Tip id — decides which glyph is shown, and keeps it stable. */
    seed: string;
    /** Bank category — picks the set and its reserved colour. */
    category?: string;
    className?: string;
}

/** How much of the 120-unit box every drawing is scaled to occupy.
    ONE value for all four sets on purpose: the auto-fit normalises each
    drawing to this, so it is the single knob that keeps the artwork the same
    visual size on every card, whatever category the deck is showing. Held
    under the full box so thick strokes (which getBBox does not measure)
    never run past the frame. */
const FILL_TARGET = 92;

export default function IdeaGlyph({ seed, category, className }: IdeaGlyphProps) {
    const set = (category && SETS[category]) || INTERIM_SET;
    const render = set.glyphs[glyphIndexFor(seed, set.glyphs.length)];
    const groupRef = React.useRef<SVGGElement>(null);
    const [fit, setFit] = React.useState({ cx: 60, cy: 60, scale: 1 });
    // Several glyphs can be mounted at once (deck card, exit overlay, admin
    // preview), and SVG ids are document-global — each instance defines its own
    // pattern. useId's colons are stripped: they are legal in a fragment but not
    // worth trusting across every url(#…) parser.
    const uid = React.useId().replace(/:/g, '');
    const hatchId = `${uid}-hatch`;

    // The glyphs are drawn at different sizes and not always symmetrically
    // around the viewBox midpoint. Measure each drawing once it's in the DOM,
    // then centre it and scale it up to fill the box, so every tip's artwork
    // fills its column identically. getBBox ignores the group's own transform,
    // so this settles in one pass rather than feeding back.
    React.useLayoutEffect(() => {
        const el = groupRef.current;
        if (!el) return;
        const b = el.getBBox();
        if (b.width === 0 || b.height === 0) return;
        setFit({
            cx: b.x + b.width / 2,
            cy: b.y + b.height / 2,
            scale: (set.fillTarget ?? FILL_TARGET) / Math.max(b.width, b.height),
        });
    }, [seed, category, set.fillTarget]);

    return (
        <svg
            viewBox="0 0 120 120"
            /* `meet` (contain): the whole drawing stays visible and centred in
               its column. The earlier `slice` cover-crop pushed shapes against
               the frame edges and read as misaligned. */
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            /* The 120-unit viewBox is drawn around 3x that on screen, so the stroke
               is kept thin to preserve the hairline weight the style depends on —
               divided by the fill scale so every glyph lands at the same weight
               regardless of how much it was enlarged. */
            strokeWidth={0.6 / fit.scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <defs>
                {/* The reference's stripes: thin diagonals in the line colour.
                    userSpaceOnUse means the pattern lives in the glyph's own
                    coordinates, so the stripes scale with the drawing and every
                    letter carries the same weave. */}
                <pattern
                    id={hatchId}
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.9" />
                </pattern>
            </defs>
            <g
                ref={groupRef}
                /* idea-glyph-anim: each direct child drifts slowly between two
                   positions, staggered — see globals.css. */
                className="idea-glyph-anim"
                transform={`translate(60 60) scale(${fit.scale.toFixed(4)}) translate(${(-fit.cx).toFixed(2)} ${(-fit.cy).toFixed(2)})`}
            >
                {render(set.accent, { hatch: `url(#${hatchId})` })}
            </g>
        </svg>
    );
}
