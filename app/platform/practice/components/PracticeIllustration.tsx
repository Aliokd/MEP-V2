"use client";

import { useId, type ReactNode } from 'react';

/**
 * Minimal geometric illustrations, one per practice: layered squares, circles,
 * triangles and bars in `currentColor`, fading grey into transparency — the
 * pixel-fade dialect of the reference pieces. Deterministic geometry, no assets.
 *
 * Size and ink come from the parent via className. Most drawings are flat
 * shape lists; the ones needing gradients or masks render through CUSTOM.
 */

type Shape =
    | { kind: 'rect'; x: number; y: number; w: number; h: number; o: number; rot?: number }
    | { kind: 'circle'; cx: number; cy: number; r: number; o: number }
    | { kind: 'poly'; points: string; o: number };

/** A pixel-grid circle: solid plateau at the heart, dissolving at the rim. */
function pixelCircle(cx: number, cy: number, R: number, step: number): Shape[] {
    const cells: Shape[] = [];
    const n = Math.ceil(R / step);
    for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
            const dx = i * step;
            const dy = j * step;
            const d = Math.sqrt(dx * dx + dy * dy) / R;
            if (d > 1.08) continue;
            // Solid heart, then one smooth linear ramp to the rim — no cliff,
            // so the edge dissolves instead of breaking into teeth.
            const o = Math.round(Math.min(0.92, 0.92 * Math.max(0, 1 - (d - 0.45) / 0.6)) * 1000) / 1000;
            if (o < 0.06) continue;
            cells.push({ kind: 'rect', x: cx + dx - step / 2, y: cy + dy - step / 2, w: step, h: step, o: Math.min(0.92, o) });
        }
    }
    return cells;
}

/** The bar-mosaic circle chosen for Master song structure. */
function structureMosaic(): Shape[] {
    const cells: Shape[] = [];
    const step = 15;
    const width = 10;
    const R = 92;
    for (let i = -6; i <= 6; i++) {
        const dx = i * step;
        const half = Math.sqrt(Math.max(0, R * R - dx * dx));
        const rows = Math.floor(half / step);
        for (let j = -rows; j <= rows; j++) {
            const dy = j * step;
            const d = Math.sqrt(dx * dx + dy * dy) / R;
            const o = Math.round((Math.pow(1 - d, 2.1) * 0.95 + 0.03) * 1000) / 1000;
            if (o < 0.04) continue;
            cells.push({ kind: 'rect', x: 110 + dx - width / 2, y: 110 + dy - step / 2, w: width, h: step, o });
        }
    }
    return cells;
}

const tri = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    `${x1},${y1} ${x2},${y2} ${x3},${y3}`;

const ART: Record<string, Shape[]> = {
    // The bar-mosaic circle: every bar of the song at once, loudest at the heart.
    'Master song structure': structureMosaic(),


    // The corner tunnel: nested frames pulling toward a dark exit.
    'Advanced structures': [
        { kind: 'rect', x: 62, y: 54, w: 106, h: 106, o: 0.1 },
        { kind: 'rect', x: 62, y: 68, w: 92, h: 92, o: 0.17 },
        { kind: 'rect', x: 62, y: 82, w: 78, h: 78, o: 0.26 },
        { kind: 'rect', x: 62, y: 96, w: 64, h: 64, o: 0.38 },
        { kind: 'rect', x: 62, y: 110, w: 50, h: 50, o: 0.55 },
        { kind: 'rect', x: 62, y: 124, w: 36, h: 36, o: 0.78 },
    ],

    // No grid at all — marks landing where they fall.
    'Free hand session': [
        { kind: 'rect', x: 52, y: 58, w: 16, h: 16, o: 0.72 },
        { kind: 'rect', x: 96, y: 44, w: 10, h: 10, o: 0.3 },
        { kind: 'rect', x: 142, y: 62, w: 13, h: 13, o: 0.5 },
        { kind: 'rect', x: 170, y: 92, w: 9, h: 9, o: 0.22 },
        { kind: 'rect', x: 70, y: 104, w: 11, h: 11, o: 0.35 },
        { kind: 'rect', x: 116, y: 96, w: 18, h: 18, o: 0.85 },
        { kind: 'rect', x: 152, y: 128, w: 12, h: 12, o: 0.42 },
        { kind: 'rect', x: 48, y: 148, w: 10, h: 10, o: 0.26 },
        { kind: 'rect', x: 92, y: 152, w: 14, h: 14, o: 0.6 },
        { kind: 'rect', x: 136, y: 164, w: 9, h: 9, o: 0.3 },
    ],

    // Everything blurs except the one note you keep humming.
    'Finding hooks': pixelCircle(110, 108, 56, 10),

    // The same shape from the opposite direction — an echo, not a copy.
    'Rhyme without cliché': [
        { kind: 'poly', points: tri(38, 156, 106, 156, 72, 84), o: 0.14 },
        { kind: 'poly', points: tri(48, 156, 96, 156, 72, 104), o: 0.32 },
        { kind: 'poly', points: tri(58, 156, 86, 156, 72, 126), o: 0.68 },
        { kind: 'poly', points: tri(114, 68, 182, 68, 148, 140), o: 0.14 },
        { kind: 'poly', points: tri(124, 68, 172, 68, 148, 120), o: 0.32 },
        { kind: 'poly', points: tri(134, 68, 162, 68, 148, 98), o: 0.68 },
    ],

    // Build a beat is drawn in CUSTOM below: its fan needs gradients.

    // Rhythm and phrasing is drawn in CUSTOM below: a pyramid needs gradients.

    // Rise, peak, and settle — the arc every story walks.
    'Telling a story': [
        { kind: 'rect', x: 40, y: 136, w: 16, h: 30, o: 0.25 },
        { kind: 'rect', x: 62, y: 116, w: 16, h: 50, o: 0.4 },
        { kind: 'rect', x: 84, y: 92, w: 16, h: 74, o: 0.6 },
        { kind: 'rect', x: 106, y: 66, w: 16, h: 100, o: 0.88 },
        { kind: 'rect', x: 128, y: 88, w: 16, h: 78, o: 0.6 },
        { kind: 'rect', x: 150, y: 112, w: 16, h: 54, o: 0.4 },
        { kind: 'rect', x: 172, y: 134, w: 16, h: 32, o: 0.25 },
    ],

    // A wash of atmosphere, and the two sharp details that make it real.
    'Imagery and detail': [
        { kind: 'rect', x: 40, y: 50, w: 116, h: 116, o: 0.09 },
        { kind: 'rect', x: 52, y: 62, w: 92, h: 92, o: 0.16 },
        { kind: 'rect', x: 64, y: 74, w: 68, h: 68, o: 0.24 },
        { kind: 'rect', x: 150, y: 76, w: 13, h: 13, o: 0.9 },
        { kind: 'rect', x: 162, y: 140, w: 9, h: 9, o: 0.65 },
    ],

    // The title, solid above everything the song goes on to say.
    'Titles that stick': [
        { kind: 'circle', cx: 110, cy: 62, r: 10, o: 0.92 },
        { kind: 'rect', x: 56, y: 96, w: 110, h: 12, o: 0.45 },
        { kind: 'rect', x: 56, y: 118, w: 95, h: 12, o: 0.3 },
        { kind: 'rect', x: 56, y: 140, w: 102, h: 12, o: 0.18 },
        { kind: 'rect', x: 56, y: 162, w: 70, h: 12, o: 0.1 },
    ],

    // The same square mid-turn — five moments of one rotation.
    'Bridges that turn': [
        { kind: 'rect', x: 68, y: 73, w: 84, h: 84, o: 0.12, rot: 0 },
        { kind: 'rect', x: 72, y: 77, w: 76, h: 76, o: 0.19, rot: 11 },
        { kind: 'rect', x: 76, y: 81, w: 68, h: 68, o: 0.28, rot: 22 },
        { kind: 'rect', x: 80, y: 85, w: 60, h: 60, o: 0.42, rot: 33 },
        { kind: 'rect', x: 84, y: 89, w: 52, h: 52, o: 0.62, rot: 44 },
    ],

    // Writing from a feeling is drawn in CUSTOM below: its petals need gradients.

    // Developing a progression is drawn in CUSTOM below: its diamonds fade.

    // Eight squares sharing one corner, each a step in from the last and a
    // step darker: the same shape restated, growing toward its source. That
    // is what developing a melody is, one phrase answered by a closer one.
    // The outermost is barely there, and the innermost nearly solid.
    'Developing a melody': Array.from({ length: 8 }, (_, i) => {
        const size = 180 - i * 20;
        const o = Math.round((0.06 + Math.pow(i / 7, 1.6) * 0.86) * 1000) / 1000;
        return { kind: 'rect', x: 20, y: 200 - size, w: size, h: size, o } as Shape;
    }),

    // A circle and a square finding the one place they agree.
    'Co-writing session': [
        { kind: 'circle', cx: 88, cy: 108, r: 46, o: 0.16 },
        { kind: 'circle', cx: 88, cy: 108, r: 33, o: 0.28 },
        { kind: 'circle', cx: 88, cy: 108, r: 20, o: 0.48 },
        { kind: 'rect', x: 104, y: 78, w: 66, h: 66, o: 0.16 },
        { kind: 'rect', x: 113, y: 87, w: 48, h: 48, o: 0.28 },
        { kind: 'rect', x: 122, y: 96, w: 30, h: 30, o: 0.48 },
    ],
};

/**
 * Drawings that need defs — gradients, masks — rather than flat shapes.
 * Each takes a unique id prefix so two cards mid-transition never collide.
 */
const CUSTOM: Record<string, (uid: string) => ReactNode> = {
    /*
     * One interval, restated: half-squares cut from one cell. The split square
     * top-left is the motif, solid; the three triangles radiating from it are
     * its variations, and each fades from full presence at the shared corner to
     * nothing at its far edge — the idea thinning as it travels from the
     * source. Gradients are in user space, one per direction of travel.
     */
    'Melody variations': (uid) => (
        <>
            <defs>
                {/* Rightward, downward-left, and down the diagonal — each ramp
                    runs from the triangle's centre-adjacent edge to its far tip. */}
                <linearGradient id={`${uid}-r`} gradientUnits="userSpaceOnUse" x1="110" y1="0" x2="200" y2="0">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${uid}-bl`} gradientUnits="userSpaceOnUse" x1="110" y1="110" x2="65" y2="155">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.45" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${uid}-br`} gradientUnits="userSpaceOnUse" x1="110" y1="110" x2="200" y2="200">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.34" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* The motif, flat: its two halves are the reference the fades leave */}
            <polygon points={tri(20, 20, 110, 20, 20, 110)} fill="currentColor" fillOpacity="0.32" />
            <polygon points={tri(110, 20, 110, 110, 20, 110)} fill="currentColor" fillOpacity="0.78" />
            {/* The variations, each dissolving toward where it is headed */}
            <polygon points={tri(110, 20, 110, 110, 200, 110)} fill={`url(#${uid}-r)`} />
            <polygon points={tri(20, 110, 110, 110, 110, 200)} fill={`url(#${uid}-bl)`} />
            <polygon points={tri(110, 110, 200, 200, 110, 200)} fill={`url(#${uid}-br)`} />
        </>
    ),

    /*
     * One circle cut on the diagonal, its two halves eased apart: a whole that
     * is two things leaning on each other, which is what a progression is. Each
     * half fades along the cut — the upper one full at its top-right shoulder
     * and thinning toward the lower-left, the lower one the reverse — so the
     * weight sits at the two far corners and the middle, where they nearly
     * meet, is the lightest. Gradients in user space, one per half, running
     * the length of the cut in opposite directions.
     *
     * Geometry: r=92 about (110,110); the cut meets the rim at (45,175) and
     * (175,45). Each half is shifted 3px off the cut, perpendicular, to open
     * the seam.
     */
    'Chord progressions': (uid) => (
        <>
            <defs>
                <linearGradient id={`${uid}-up`} gradientUnits="userSpaceOnUse" x1="175" y1="45" x2="45" y2="175">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.88" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.32" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id={`${uid}-lo`} gradientUnits="userSpaceOnUse" x1="45" y1="175" x2="175" y2="45">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.88" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.32" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
                </linearGradient>
            </defs>
            {/* Upper-left half: from the lower-left rim point clockwise over the top */}
            <path
                d="M 44.95 175.05 A 92 92 0 0 1 175.05 44.95 Z"
                fill={`url(#${uid}-up)`}
                transform="translate(-3 -3)"
            />
            {/* Lower-right half: the same two points, round the bottom */}
            <path
                d="M 44.95 175.05 A 92 92 0 0 0 175.05 44.95 Z"
                fill={`url(#${uid}-lo)`}
                transform="translate(3 3)"
            />
        </>
    ),

    /*
     * A pyramid, lit from one side: a tall triangle split down its axis into
     * a lighter face and a deeper one. A pulse is a peak and a fall, and a
     * bar is the same shape repeated, so the one shape is the practice. The
     * two faces are kept nearly flat, one plainly lighter than the other:
     * it is the edge between them that makes a pyramid read, and a fade
     * that ran to nothing softened it away. Gradients in user space, one
     * per face, both running apex to base.
     *
     * Geometry: apex (110,28), base from (26,196) to (194,196), the axis at
     * x=110.
     */
    'Rhythm and phrasing': (uid) => (
        <>
            <defs>
                {/* Heavy stops: periwinkle is a pale colour, and the card
                    shows the drawing at reduced opacity. */}
                {/* The lit face thins toward its foot, but never to nothing:
                    the base edge has to stay. */}
                <linearGradient id={`${uid}-lit`} gradientUnits="userSpaceOnUse" x1="110" y1="28" x2="68" y2="196">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.62" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.44" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
                </linearGradient>
                <linearGradient id={`${uid}-shade`} gradientUnits="userSpaceOnUse" x1="110" y1="28" x2="152" y2="196">
                    <stop offset="0" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.88" />
                </linearGradient>
            </defs>
            {/* The lit face */}
            <polygon points={tri(110, 28, 26, 196, 110, 196)} fill={`url(#${uid}-lit)`} />
            {/* The shaded face */}
            <polygon points={tri(110, 28, 110, 196, 194, 196)} fill={`url(#${uid}-shade)`} />
        </>
    ),

    /*
     * Three petals through one centre: the same ellipse turned three ways,
     * each full at one tip and gone by the other, so where they cross the
     * translucency stacks into a soft, edgeless bloom. A feeling has no
     * outline, only a centre and directions it leans, which is what this is.
     * Monochrome like every card here: the reference had three colours, and
     * this has one in three weights.
     *
     * One gradient serves all three: it is declared in user space along the
     * ellipse's long axis, and user space rotates with each group.
     */
    'Writing from a feeling': (uid) => (
        <>
            <defs>
                {/* The far tip keeps a little weight rather than vanishing, so
                    each petal's edge stays readable where it leaves the bloom. */}
                <linearGradient id={`${uid}-petal`} gradientUnits="userSpaceOnUse" x1="200" y1="110" x2="20" y2="110">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.8" />
                    <stop offset="0.45" stopColor="currentColor" stopOpacity="0.44" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
                </linearGradient>
            </defs>
            {[0, 60, 120].map(angle => (
                <g key={angle} transform={`rotate(${angle} 110 110)`}>
                    <ellipse cx="110" cy="110" rx="90" ry="48" fill={`url(#${uid}-petal)`} />
                </g>
            ))}
        </>
    ),

    /*
     * Two diamonds, one over the other, sharing a smaller diamond where they
     * cross: a plain progression and the same one made richer, and the
     * overlap is where both are true at once. Each is light at its outer tip
     * and gains weight toward the crossing, so the crossing, where the two
     * stack, is the darkest thing on the card. The upper one is the heavier.
     * Gradients in user space, one per diamond, each running tip to tip.
     *
     * Geometry: both diamonds 130 across, centred on x=110; the upper one
     * about y=78, the lower about y=142, so they share a 66px-tall diamond.
     */
    'Developing a progression': (uid) => (
        <>
            <defs>
                <linearGradient id={`${uid}-upper`} gradientUnits="userSpaceOnUse" x1="0" y1="13" x2="0" y2="143">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id={`${uid}-lower`} gradientUnits="userSpaceOnUse" x1="0" y1="207" x2="0" y2="77">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.62" />
                </linearGradient>
            </defs>
            {/* The lower diamond, light at its foot */}
            <polygon points="110,77 175,142 110,207 45,142" fill={`url(#${uid}-lower)`} />
            {/* The upper diamond, light at its head, heavy where it meets the other */}
            <polygon points="110,13 175,78 110,143 45,78" fill={`url(#${uid}-upper)`} />
        </>
    ),

    /*
     * A heart made of the plain shapes: a square turned on its corner and
     * two circles sitting on its upper sides. None of the parts is a heart;
     * together they are one, which is what finishing a verse is: the lines
     * that were given and the lines you add, reading as a single thing.
     * Every part is translucent, so the circles keep their outlines where
     * they cross the square and each other, and the weight builds in the
     * overlaps. One fade serves all three, full at the top and thinning to
     * the point.
     *
     * Geometry: the square is 100 a side about (110,118), so its corners sit
     * at (110,47), (181,118), (110,189) and (39,118); the circles are r=50
     * on the midpoints of its upper sides, (74.5,82.5) and (145.5,82.5).
     */
    'Finishing a verse': (uid) => (
        <>
            <defs>
                <linearGradient id={`${uid}-heart`} gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="0" y2="189">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.7" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.46" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
            </defs>
            {/* The square on its corner: the point of the heart */}
            <polygon points="110,47 181,118 110,189 39,118" fill={`url(#${uid}-heart)`} />
            {/* The two lobes, whole, so their circles read */}
            <circle cx="74.5" cy="82.5" r="50" fill={`url(#${uid}-heart)`} />
            <circle cx="145.5" cy="82.5" r="50" fill={`url(#${uid}-heart)`} />
        </>
    ),

    /*
     * Two quarter discs from opposite corners of one square, crossing. The
     * disc from the top-left corner is the chords, the ground everything
     * sits on; the disc from the bottom-right is the melody laid over it;
     * and where they overlap, the two stack, which is the two heard
     * together. Each disc fades from its own corner toward the far one.
     * Gradients in user space, one per disc. A drawn lens once marked the
     * overlap; the overlap marks itself, and the lens was one shape too
     * many.
     *
     * Geometry: the square is 30..190. The discs are r=146 about (30,30)
     * and (190,190), stopping short of the far corners so the two arcs
     * stay visible as arcs.
     */
    'Melody over chords': (uid) => (
        <>
            <defs>
                {/* The upper disc runs to nothing at its far end, so the
                    lower one shows through where they cross; the lower one
                    keeps a trace at its far end, so its arc is still there. */}
                <linearGradient id={`${uid}-ground`} gradientUnits="userSpaceOnUse" x1="30" y1="30" x2="176" y2="176">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.72" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.26" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${uid}-over`} gradientUnits="userSpaceOnUse" x1="190" y1="190" x2="44" y2="44">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.72" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
                </linearGradient>
            </defs>
            {/* The chords: from the top-left corner, sweeping toward the far corners */}
            <path d="M 30 30 H 176 A 146 146 0 0 1 30 176 Z" fill={`url(#${uid}-ground)`} />
            {/* The melody: from the bottom-right corner, sweeping the other way */}
            <path d="M 190 190 V 44 A 146 146 0 0 0 44 190 Z" fill={`url(#${uid}-over)`} />
        </>
    ),

    /*
     * A bird on a circle: a body that is one diagonal band, its tail
     * running out past the circle at the lower left and its head rounding
     * off at the upper right into a short beak. Above the body the circle
     * is light, below it heavy. The one figure on the card set, kept
     * because the reference is the figure: a bird is a beat, small and
     * steady and always the same shape. The circle takes one gradient,
     * light at its upper-left shoulder and full at its lower-right; the
     * bird takes another, full at the head and thinning down the body to
     * the tail, so it fades the way everything else on the cards does.
     *
     * Geometry: the circle is r=62 about (120,112). The body is traced from
     * the reference at that scale: the back runs at 45° from the tail's
     * left corner (35,172) to the head at (132,74), domes over to the
     * shoulder (193,76), points to the beak (204,89), comes back under the
     * chin (189,98) and round the throat, bulging down into the circle, to
     * (135,97), then down the underside, parallel to the back, to the
     * tail's right corner (65,172).
     */
    'Build a beat': (uid) => (
        <>
            <defs>
                {/* Heavy stops: periwinkle is pale, and the card shows the
                    drawing at reduced opacity. */}
                <linearGradient id={`${uid}-disc`} gradientUnits="userSpaceOnUse" x1="76" y1="68" x2="164" y2="156">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.1" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.92" />
                </linearGradient>
                {/* Head to tail, along the body's own diagonal */}
                <linearGradient id={`${uid}-bird`} gradientUnits="userSpaceOnUse" x1="190" y1="80" x2="40" y2="172">
                    <stop offset="0" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.84" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.5" />
                </linearGradient>
            </defs>
            <circle cx="120" cy="112" r="62" fill={`url(#${uid}-disc)`} />
            <path
                d="M 35.3 171.9 L 131.8 73.6 Q 164 44 193 76 L 204 89 L 189 98 Q 162 110 134.8 97.2 L 64.8 171.9 Z"
                fill={`url(#${uid}-bird)`}
            />
        </>
    ),

    /*
     * Two pills interlocked: one rounded at its foot and fading away upward,
     * the other rounded at its head and fading away downward, overlapping
     * down the middle. The same shape twice, turned over and moved along,
     * which is what a rhythm is: a figure and its answer, the weight landing
     * at opposite ends. Where they overlap the two fades stack. Gradients in
     * user space, one per pill, each running from its rounded end.
     *
     * Geometry: both pills 100 wide by 160 tall in a 30..190 square; the
     * left one spans x 30..130, the right x 90..190, so they share a 40px
     * column. Each cap is a half-circle of radius 50.
     */
    'Developing a rhythm': (uid) => (
        <>
            <defs>
                {/* Heavy stops: sage is the palest tint on the set, and the
                    card shows the drawing at reduced opacity. */}
                <linearGradient id={`${uid}-up`} gradientUnits="userSpaceOnUse" x1="0" y1="190" x2="0" y2="30">
                    <stop offset="0" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.72" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
                </linearGradient>
                <linearGradient id={`${uid}-down`} gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="190">
                    <stop offset="0" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="0.55" stopColor="currentColor" stopOpacity="0.72" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
                </linearGradient>
            </defs>
            {/* The left pill: square at the top, round at the foot, full at the foot */}
            <path d="M 30 30 H 130 V 140 A 50 50 0 0 1 30 140 Z" fill={`url(#${uid}-up)`} />
            {/* The right pill: round at the head, square at the foot, full at the head */}
            <path d="M 90 190 V 80 A 50 50 0 0 1 190 80 V 190 Z" fill={`url(#${uid}-down)`} />
        </>
    ),

    /*
     * A pinwheel of nine blades — one phrase turned nine ways round a single
     * centre, which is the practice. Each blade is the same circle set on a
     * ring and eclipsed by its neighbour one step round, so what survives is a
     * crescent; the gradient runs from full weight at the heart to nearly
     * nothing at the rim, and where crescents overlap the translucency stacks
     * into the swirl's shading. Monochrome on purpose: currentColor, like every
     * card here, with a pinprick of the card's own ground at the centre.
     *
     * One mask and one gradient serve all nine blades — both are declared in
     * user space, and user space rotates with the group that references them.
     */
    'Composing verses': (uid) => {
        const N = 9;
        const step = 360 / N;
        // The neighbouring circle, one step round the ring (d=40, y down).
        const nx = 110 + 40 * Math.cos((step * Math.PI) / 180);
        const ny = 110 + 40 * Math.sin((step * Math.PI) / 180);
        return (
            <>
                <defs>
                    {/* Along the blade's sweep, horn to horn — the crescent's two
                        tips sit at the circles' intersections, (96,105) by the
                        centre and (194,141) out at the rim. A radial fade kept
                        neighbouring blades at the same value wherever they met
                        and the seams vanished; running the ramp along the sweep
                        puts each blade's dark shoulder against the faded tail of
                        the one beneath it, which is what makes the swirl read. */}
                    <linearGradient id={`${uid}-p`} gradientUnits="userSpaceOnUse" x1="96" y1="105" x2="194" y2="141">
                        <stop offset="0" stopColor="currentColor" stopOpacity="0.72" />
                        <stop offset="0.5" stopColor="currentColor" stopOpacity="0.3" />
                        <stop offset="0.85" stopColor="currentColor" stopOpacity="0.05" />
                        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="220">
                        <circle cx="150" cy="110" r="54" fill="white" />
                        <circle cx={nx} cy={ny} r="54" fill="black" />
                    </mask>
                </defs>
                {Array.from({ length: N }, (_, i) => (
                    <g key={i} transform={`rotate(${i * step} 110 110)`} mask={`url(#${uid}-m)`}>
                        <circle cx="150" cy="110" r="54" fill={`url(#${uid}-p)`} />
                    </g>
                ))}
                {/* The still point the whole thing turns on — the card's ground. */}
                <circle cx="110" cy="110" r="5" fill="#FAF9F5" />
            </>
        );
    },
};

/*
 * Every drawing is made in the same 220-square, but each fills it to its
 * own extent — a diamond pair is tall and narrow, the bird wide and low —
 * and side by side on the cards they read as different sizes. So each one
 * is fitted after the fact: its drawn extent, measured once, is scaled so
 * that its longer side is FIT long and centred on the square. Nothing is
 * stretched; a wide drawing stays wide. A drawing not listed here is shown
 * as drawn.
 *
 * Extents are the drawn geometry, not the browser's bounding box: a rotated
 * or masked group reports the box of what it was before the rotation or the
 * mask, which overstates the pinwheel and the bloom.
 */
const FIT = 180;
const EXTENT: Record<string, { x: number; y: number; w: number; h: number }> = {
    'Master song structure': { x: 30, y: 27.5, w: 160, h: 165 },
    'Composing verses': { x: 16, y: 16, w: 188, h: 188 },
    'Melody variations': { x: 20, y: 20, w: 180, h: 180 },
    'Chord progressions': { x: 15.7, y: 15.7, w: 188.6, h: 188.6 },
    'Rhythm and phrasing': { x: 26, y: 28, w: 168, h: 168 },
    'Writing from a feeling': { x: 20, y: 28, w: 180, h: 164 },
    'Developing a melody': { x: 20, y: 20, w: 180, h: 180 },
    'Developing a progression': { x: 45, y: 13, w: 130, h: 194 },
    'Developing a rhythm': { x: 30, y: 30, w: 160, h: 160 },
    'Finishing a verse': { x: 24.5, y: 32.5, w: 171, h: 156.5 },
    'Melody over chords': { x: 30, y: 30, w: 160, h: 160 },
    'Build a beat': { x: 35.3, y: 50, w: 168.7, h: 124 },
};

/** The transform that fits a listed drawing to the shared size; none for the rest. */
function fitTransform(name: string): string | undefined {
    const e = EXTENT[name];
    if (!e) return undefined;
    const s = FIT / Math.max(e.w, e.h);
    const tx = 110 - (e.x + e.w / 2) * s;
    const ty = 110 - (e.y + e.h / 2) * s;
    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`;
}

const DEFAULT_ART: Shape[] = [
    { kind: 'circle', cx: 110, cy: 110, r: 52, o: 0.12 },
    { kind: 'circle', cx: 110, cy: 110, r: 38, o: 0.22 },
    { kind: 'circle', cx: 110, cy: 110, r: 24, o: 0.4 },
    { kind: 'circle', cx: 110, cy: 110, r: 11, o: 0.8 },
];

/*
 * Each card's artwork in a monochrome of one brand colour — the four reserved
 * category accents from the tips artwork, matched by subject: Practice 1 lives
 * in the exercise's own green family, Composing verses is lyric work (BLUE
 * belongs to lyrics), and Melody takes the melody purple. Everything here is
 * drawn in currentColor with opacity ramps, so a single colour on the svg is
 * all a tint takes; anything unlisted keeps the parent's stone ink.
 */
const TINT: Record<string, string> = {
    'Master song structure': '#5F9857',
    'Composing verses': '#6FA8D6',
    'Melody variations': '#9B7BE0',
    // Gold from the supporting palette: the brand's chord colour is the same
    // green Master song structure already wears, and two green cards in a
    // row would read as one practice twice.
    'Chord progressions': '#C5A059',
    // Periwinkle from the accent palette, the last of the brand's colours
    // not already worn by a card.
    'Rhythm and phrasing': '#A2B0DF',
    // The reserved "vibe" pink: a practice that starts from a feeling.
    'Writing from a feeling': '#F0A8C9',
    // The lighter melody purple: the same family as Melody, one shade up,
    // which is what this practice is to that one.
    'Developing a melody': '#B79DF0',
    // The brand's chord green, one shade up from the structure card's, which
    // is what this practice is to Chord progressions.
    'Developing a progression': '#86BE7F',
    // Sage from the accent palette, the last of the brand's colours not yet
    // worn by a card.
    'Developing a rhythm': '#ADCDC0',
    // The reserved lyrics blue: lyric work, in the family Composing verses
    // wears one shade darker. It wore the accent palette's warm grey first,
    // and at card opacity that was too pale to read.
    'Finishing a verse': '#8EC9F0',
    // Blossom pink from the accent palette, a shade down: melody and chords
    // together, in the brightest colour the brand keeps for decoration. The
    // palette's own #FBB1FF was too pale at card opacity.
    'Melody over chords': '#E48BE9',
    // Periwinkle a shade down from Rhythm's: the same family, the whole kit.
    'Build a beat': '#8593CB',
};

interface PracticeIllustrationProps {
    /** The practice's stable English name from the catalogue. */
    name: string;
    className?: string;
}

export default function PracticeIllustration({ name, className }: PracticeIllustrationProps) {
    // useId emits colon-wrapped ids; strip them for safe url(#...) references.
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const custom = CUSTOM[name];
    const tint = TINT[name];
    // The fit wraps the drawing, gradients and masks included: they are
    // declared in user space, and user space is what the group transforms.
    const fit = fitTransform(name);
    if (custom) {
        return (
            <svg viewBox="0 0 220 220" className={className} style={tint ? { color: tint } : undefined} aria-hidden="true" role="presentation">
                <g transform={fit}>{custom(uid)}</g>
            </svg>
        );
    }

    const shapes = ART[name] ?? DEFAULT_ART;

    return (
        <svg viewBox="0 0 220 220" className={className} style={tint ? { color: tint } : undefined} aria-hidden="true" role="presentation">
            <g transform={fit}>
                {shapes.map((s, i) => {
                    if (s.kind === 'circle') {
                        return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="currentColor" fillOpacity={s.o} />;
                    }
                    if (s.kind === 'poly') {
                        return <polygon key={i} points={s.points} fill="currentColor" fillOpacity={s.o} />;
                    }
                    const rot = s.rot
                        ? `rotate(${s.rot} ${s.x + s.w / 2} ${s.y + s.h / 2})`
                        : undefined;
                    return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="currentColor" fillOpacity={s.o} transform={rot} />;
                })}
            </g>
        </svg>
    );
}
