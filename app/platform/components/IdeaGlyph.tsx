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
 *   melody → abstract music notation (the poster reference): hairline stems,
 *            beams, flag lines and staff fragments, with solid note heads and
 *            petals — in the brand PURPLE, reserved for melody.
 *
 *   vibe → isometric solids: one solid per card — pyramid, cube, coin,
 *            dome — monochrome in the brand BEIGE family, faces graded light
 *            to dark so the volume reads without a second colour.
 *
 * Within a set, each tip is mapped onto one drawing by a hash of its id: the
 * pairing is arbitrary but stable, so a given tip always shows the same picture
 * no matter how the deck is filtered or ordered.
 *
 * Strokes use `currentColor`, so the line tone comes from the parent's text
 * class; only the accent fills are the component's own.
 */

/** Paint effects a set may draw with, as fill urls into this instance's own
 *  <defs>. Sets take what they need and ignore the rest: lyrics uses the
 *  stripe `hatch`; vibe paints its faces with the three `iso*` gradients —
 *  a monochrome beige ramp (iso2 lightest for tops, iso1 mid, iso3 dark). */
interface Fx {
    hatch: string;
    iso1: string;
    iso2: string;
    iso3: string;
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
/* Melody — abstract music notation.                                   */
/* Hairline stems, beams and staff fragments; solid heads and petals   */
/* in the set's purple. A rare small dot is inked in currentColor,     */
/* as the reference peppers its structures with black dots.            */
/* ------------------------------------------------------------------ */

/** A note head — the reference's rounded blob, tilted like real notation. */
const Head = ({ cx, cy, a, rot = -18 }: { cx: number; cy: number; a: string; rot?: number }) => (
    <ellipse cx={cx} cy={cy} rx={8} ry={5.5} transform={`rotate(${rot} ${cx} ${cy})`} fill={a} stroke="none" />
);

/** A leaf/petal — the reference's second recurring solid. */
const Petal = ({ cx, cy, rot, a }: { cx: number; cy: number; rot: number; a: string }) => (
    <ellipse cx={cx} cy={cy} rx={8} ry={4.5} transform={`rotate(${rot} ${cx} ${cy})`} fill={a} stroke="none" />
);

/** An inked dot, in the line colour. */
const Dot = ({ cx, cy, r = 2.6 }: { cx: number; cy: number; r?: number }) => (
    <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

const MELODY_GLYPHS: Glyph[] = [
    // 1 — single note, triple flag
    (a) => (
        <>
            <line x1="70" y1="28" x2="70" y2="86" />
            <Head cx={63} cy={88} a={a} />
            <line x1="70" y1="28" x2="92" y2="36" />
            <line x1="70" y1="36" x2="92" y2="44" />
            <line x1="70" y1="44" x2="92" y2="52" />
        </>
    ),
    // 2 — beamed pair, descending
    (a) => (
        <>
            <line x1="44" y1="32" x2="44" y2="82" />
            <line x1="76" y1="40" x2="76" y2="90" />
            <line x1="44" y1="32" x2="76" y2="40" />
            <line x1="44" y1="40" x2="76" y2="48" />
            <Head cx={37} cy={84} a={a} />
            <Head cx={69} cy={92} a={a} />
        </>
    ),
    // 3 — staff fragment with heads resting on it
    (a) => (
        <>
            <line x1="26" y1="40" x2="94" y2="40" />
            <line x1="26" y1="48" x2="94" y2="48" />
            <line x1="26" y1="56" x2="94" y2="56" />
            <line x1="26" y1="64" x2="94" y2="64" />
            <line x1="26" y1="72" x2="94" y2="72" />
            <Head cx={46} cy={48} a={a} rot={0} />
            <Head cx={66} cy={60} a={a} rot={0} />
            <Head cx={82} cy={44} a={a} rot={0} />
            <Dot cx={36} cy={68} />
        </>
    ),
    // 4 — tall ladder with a head and petal
    (a) => (
        <>
            <line x1="46" y1="26" x2="46" y2="94" />
            <line x1="74" y1="26" x2="74" y2="94" />
            <line x1="46" y1="34" x2="74" y2="34" />
            <line x1="46" y1="44" x2="74" y2="44" />
            <line x1="46" y1="54" x2="74" y2="54" />
            <Head cx={66} cy={92} a={a} />
            <Petal cx={84} cy={64} rot={-35} a={a} />
        </>
    ),
    // 5 — petal sprig on a stem
    (a) => (
        <>
            <line x1="60" y1="30" x2="60" y2="92" />
            <Petal cx={50} cy={44} rot={-35} a={a} />
            <Petal cx={70} cy={52} rot={35} a={a} />
            <Petal cx={50} cy={62} rot={-35} a={a} />
            <Petal cx={70} cy={70} rot={35} a={a} />
            <Dot cx={60} cy={30} />
        </>
    ),
    // 6 — flag cascade
    (a) => (
        <>
            <line x1="40" y1="28" x2="40" y2="92" />
            <line x1="40" y1="32" x2="88" y2="44" />
            <line x1="40" y1="40" x2="88" y2="52" />
            <line x1="40" y1="48" x2="88" y2="60" />
            <line x1="40" y1="56" x2="88" y2="68" />
            <Head cx={48} cy={88} a={a} />
            <circle cx="84" cy="40" r="4" fill={a} stroke="none" />
        </>
    ),
    // 7 — chord ladder: two stems, beams, two heads
    (a) => (
        <>
            <line x1="52" y1="28" x2="52" y2="88" />
            <line x1="68" y1="28" x2="68" y2="88" />
            <line x1="52" y1="28" x2="68" y2="28" />
            <line x1="52" y1="36" x2="68" y2="36" />
            <Head cx={45} cy={86} a={a} />
            <Head cx={75} cy={86} a={a} />
        </>
    ),
    // 8 — sun on a line, petal drifting away
    (a) => (
        <>
            <path d="M38,62 A17,17 0 0 1 72,62 Z" fill={a} stroke="none" />
            <line x1="28" y1="62" x2="92" y2="62" />
            <Petal cx={80} cy={74} rot={35} a={a} />
            <Dot cx={86} cy={48} />
        </>
    ),
    // 9 — descending run of three
    (a) => (
        <>
            <line x1="40" y1="36" x2="40" y2="76" />
            <line x1="58" y1="44" x2="58" y2="84" />
            <line x1="76" y1="52" x2="76" y2="92" />
            <line x1="40" y1="36" x2="76" y2="52" />
            <Head cx={33} cy={78} a={a} />
            <Head cx={51} cy={86} a={a} />
            <Head cx={69} cy={90} a={a} />
        </>
    ),
    // 10 — staff over a quarter blob
    (a) => (
        <>
            <line x1="30" y1="36" x2="90" y2="36" />
            <line x1="30" y1="44" x2="90" y2="44" />
            <line x1="30" y1="52" x2="90" y2="52" />
            <line x1="30" y1="60" x2="90" y2="60" />
            <path d="M40,70 A20,20 0 0 1 60,90 L40,90 Z" fill={a} stroke="none" />
            <Dot cx={74} cy={78} r={3} />
        </>
    ),
    // 11 — mirrored flags
    (a) => (
        <>
            <line x1="60" y1="26" x2="60" y2="94" />
            <line x1="60" y1="30" x2="30" y2="42" />
            <line x1="60" y1="40" x2="30" y2="52" />
            <line x1="60" y1="50" x2="30" y2="62" />
            <line x1="60" y1="30" x2="90" y2="42" />
            <line x1="60" y1="40" x2="90" y2="52" />
            <Head cx={60} cy={90} a={a} rot={0} />
        </>
    ),
    // 12 — ringed sun and a note
    (a) => (
        <>
            <circle cx="74" cy="42" r="13" />
            <circle cx="74" cy="42" r="7" fill={a} stroke="none" />
            <line x1="87" y1="42" x2="87" y2="86" />
            <Head cx={80} cy={88} a={a} />
        </>
    ),
    // 13 — ladder with petals off the side
    (a) => (
        <>
            <line x1="50" y1="28" x2="50" y2="92" />
            <line x1="66" y1="28" x2="66" y2="92" />
            <line x1="50" y1="80" x2="66" y2="80" />
            <line x1="50" y1="88" x2="66" y2="88" />
            <Petal cx={40} cy={40} rot={-30} a={a} />
            <Petal cx={40} cy={56} rot={-30} a={a} />
            <Dot cx={58} cy={36} />
        </>
    ),
    // 14 — long beam, three hanging notes
    (a) => (
        <>
            <line x1="30" y1="40" x2="90" y2="28" />
            <line x1="38" y1="38" x2="38" y2="80" />
            <line x1="60" y1="34" x2="60" y2="86" />
            <line x1="82" y1="30" x2="82" y2="74" />
            <Head cx={31} cy={82} a={a} />
            <Head cx={53} cy={88} a={a} />
            <Head cx={75} cy={76} a={a} />
        </>
    ),
    // 15 — burst corner
    (a) => (
        <>
            <line x1="40" y1="32" x2="40" y2="96" />
            <line x1="40" y1="32" x2="96" y2="32" />
            <line x1="40" y1="40" x2="96" y2="40" />
            <line x1="40" y1="48" x2="96" y2="48" />
            <Head cx={48} cy={58} a={a} rot={0} />
            <Petal cx={58} cy={72} rot={40} a={a} />
            <Head cx={50} cy={90} a={a} />
            <Dot cx={78} cy={64} />
        </>
    ),
    // 16 — grand pair on a double rail
    (a) => (
        <>
            <line x1="34" y1="84" x2="90" y2="84" />
            <line x1="34" y1="92" x2="90" y2="92" />
            <line x1="42" y1="84" x2="42" y2="40" />
            <line x1="78" y1="84" x2="78" y2="32" />
            <line x1="42" y1="40" x2="78" y2="32" />
            <Head cx={35} cy={80} a={a} />
            <Head cx={71} cy={78} a={a} />
            <Petal cx={60} cy={50} rot={-25} a={a} />
        </>
    ),
];

/* ------------------------------------------------------------------ */
/* Vibe — isometric solids, monochrome.                                */
/* ONE solid per card — pyramid, cube, coin, dome — its faces graded   */
/* across a beige ramp from the brand family: light tops, darker       */
/* sides, so the volume reads without a second colour anywhere.        */
/* ------------------------------------------------------------------ */

const VIBE_GLYPHS: Glyph[] = [
    // 1 — pyramid
    (_a, { iso1, iso3 }) => (
        <>
            <polygon points="60,26 32,78 60,94" fill={iso1} stroke="none" />
            <polygon points="60,26 88,78 60,94" fill={iso3} stroke="none" />
        </>
    ),
    // 2 — slab
    (_a, { iso1 }) => (
        <rect x="0" y="0" width="60" height="22" rx="11" fill={iso1} stroke="none" transform="translate(28 74) rotate(-22)" />
    ),
    // 3 — cube
    (_a, { iso1, iso2, iso3 }) => (
        <>
            <polygon points="60,26 88,42 60,58 32,42" fill={iso2} stroke="none" />
            <polygon points="32,42 60,58 60,90 32,74" fill={iso1} stroke="none" />
            <polygon points="88,42 60,58 60,90 88,74" fill={iso3} stroke="none" />
        </>
    ),
    // 4 — coin
    (_a, { iso2, iso3 }) => (
        <>
            <path d="M32,58 L32,72 A28,11 0 0 0 88,72 L88,58 Z" fill={iso3} stroke="none" />
            <ellipse cx="60" cy="58" rx="28" ry="11" fill={iso2} stroke="none" />
        </>
    ),
    // 5 — octahedron
    (_a, { iso1, iso3 }) => (
        <>
            <polygon points="60,24 88,58 32,58" fill={iso1} stroke="none" />
            <polygon points="32,58 88,58 60,94" fill={iso3} stroke="none" />
        </>
    ),
    // 6 — cylinder
    (_a, { iso1, iso2 }) => (
        <>
            <path d="M36,36 L36,78 A24,10 0 0 0 84,78 L84,36 Z" fill={iso1} stroke="none" />
            <ellipse cx="60" cy="36" rx="24" ry="10" fill={iso2} stroke="none" />
        </>
    ),
    // 7 — tall box
    (_a, { iso1, iso2, iso3 }) => (
        <>
            <polygon points="60,24 78,34 60,44 42,34" fill={iso2} stroke="none" />
            <polygon points="42,34 60,44 60,92 42,82" fill={iso1} stroke="none" />
            <polygon points="78,34 60,44 60,92 78,82" fill={iso3} stroke="none" />
        </>
    ),
    // 8 — cone
    (_a, { iso1, iso3 }) => (
        <>
            <ellipse cx="60" cy="78" rx="26" ry="11" fill={iso3} stroke="none" />
            <polygon points="60,26 34,78 86,78" fill={iso1} stroke="none" />
        </>
    ),
    // 9 — floating plane
    (_a, { iso2 }) => (
        <polygon points="28,58 66,36 92,50 54,72" fill={iso2} stroke="none" />
    ),
    // 10 — dome
    (_a, { iso1, iso3 }) => (
        <>
            <path d="M30,72 A30,30 0 0 1 90,72 Z" fill={iso1} stroke="none" />
            <ellipse cx="60" cy="72" rx="30" ry="10" fill={iso3} stroke="none" />
        </>
    ),
    // 11 — flat ring
    (_a, { iso1 }) => (
        <path
            d="M30,60 a30,12 0 1 0 60,0 a30,12 0 1 0 -60,0 Z M45,60 a15,6 0 1 0 30,0 a15,6 0 1 0 -30,0 Z"
            fill={iso1}
            fillRule="evenodd"
            stroke="none"
        />
    ),
    // 12 — sphere
    (_a, { iso1 }) => (
        <circle cx="60" cy="60" r="30" fill={iso1} stroke="none" />
    ),
    // 13 — tilted card
    (_a, { iso2 }) => (
        <rect x="0" y="0" width="54" height="34" rx="8" fill={iso2} stroke="none" transform="translate(30 56) rotate(-18)" />
    ),
    // 14 — arch
    (_a, { iso1 }) => (
        <path d="M30,80 A30,30 0 0 1 90,80 L74,80 A14,14 0 0 0 46,80 Z" fill={iso1} stroke="none" />
    ),
    // 15 — rhombus tile
    (_a, { iso2 }) => (
        <polygon points="32,60 60,42 88,60 60,78" fill={iso2} stroke="none" />
    ),
    // 16 — gem
    (_a, { iso1, iso2, iso3 }) => (
        <>
            <polygon points="60,28 84,48 36,48" fill={iso2} stroke="none" />
            <polygon points="36,48 60,48 60,92" fill={iso1} stroke="none" />
            <polygon points="60,48 84,48 60,92" fill={iso3} stroke="none" />
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
    /** Vibe is monochrome beige; `accent` is only the registry's nominal
     *  colour — the faces read from the iso ramp, not from this. */
    vibe: { glyphs: VIBE_GLYPHS, accent: '#D7D8CD' },
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

/** How much of the 120-unit box the drawing is scaled to occupy — a little
    under the full box so hairline strokes never kiss the frame. */
const FILL_TARGET = 114;

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
    const iso1Id = `${uid}-iso1`;
    const iso2Id = `${uid}-iso2`;
    const iso3Id = `${uid}-iso3`;

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
                {/* Vibe's face gradients — one monochrome beige ramp from the
                    brand family (#E6E3DB / #D7D8CD territory): iso2 lightest
                    for top faces, iso1 mid, iso3 darkest for shadow sides.
                    Default objectBoundingBox units, so every face runs its own
                    full blend regardless of where it sits in the drawing. */}
                <linearGradient id={iso1Id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#E2DFD3" />
                    <stop offset="1" stopColor="#CBC7B8" />
                </linearGradient>
                <linearGradient id={iso2Id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#EFEDE4" />
                    <stop offset="1" stopColor="#DFDCD0" />
                </linearGradient>
                <linearGradient id={iso3Id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#D2CEC0" />
                    <stop offset="1" stopColor="#B3AE9C" />
                </linearGradient>
            </defs>
            <g
                ref={groupRef}
                transform={`translate(60 60) scale(${fit.scale.toFixed(4)}) translate(${(-fit.cx).toFixed(2)} ${(-fit.cy).toFixed(2)})`}
            >
                {render(set.accent, {
                    hatch: `url(#${hatchId})`,
                    iso1: `url(#${iso1Id})`,
                    iso2: `url(#${iso2Id})`,
                    iso3: `url(#${iso3Id})`,
                })}
            </g>
        </svg>
    );
}
