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

    // Two soft circles sharing air: the melody, and the answer to it.
    'Melody variations': [
        { kind: 'circle', cx: 88, cy: 94, r: 48, o: 0.14 },
        { kind: 'circle', cx: 88, cy: 94, r: 36, o: 0.24 },
        { kind: 'circle', cx: 88, cy: 94, r: 24, o: 0.4 },
        { kind: 'circle', cx: 88, cy: 94, r: 12, o: 0.75 },
        { kind: 'circle', cx: 134, cy: 126, r: 48, o: 0.14 },
        { kind: 'circle', cx: 134, cy: 126, r: 36, o: 0.24 },
        { kind: 'circle', cx: 134, cy: 126, r: 24, o: 0.4 },
        { kind: 'circle', cx: 134, cy: 126, r: 12, o: 0.75 },
    ],

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

    // Long and short strokes against a steady pulse.
    'Rhythm and phrasing': [
        { kind: 'rect', x: 38, y: 76, w: 9, h: 68, o: 0.8 },
        { kind: 'rect', x: 57, y: 76, w: 9, h: 68, o: 0.3 },
        { kind: 'rect', x: 76, y: 76, w: 22, h: 68, o: 0.6 },
        { kind: 'rect', x: 108, y: 76, w: 9, h: 68, o: 0.25 },
        { kind: 'rect', x: 127, y: 76, w: 34, h: 68, o: 0.85 },
        { kind: 'rect', x: 171, y: 76, w: 9, h: 68, o: 0.35 },
    ],

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

    // Translucent chords climbing, each new one leaning on the last.
    'Chord progressions': [
        { kind: 'rect', x: 42, y: 118, w: 56, h: 56, o: 0.25 },
        { kind: 'rect', x: 74, y: 100, w: 56, h: 56, o: 0.38 },
        { kind: 'rect', x: 106, y: 82, w: 56, h: 56, o: 0.52 },
        { kind: 'rect', x: 138, y: 64, w: 56, h: 56, o: 0.7 },
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

    // A feeling radiating outward from a warm centre, no edges anywhere.
    'Writing from a feeling': [
        { kind: 'circle', cx: 110, cy: 112, r: 66, o: 0.09 },
        { kind: 'circle', cx: 110, cy: 112, r: 52, o: 0.16 },
        { kind: 'circle', cx: 110, cy: 112, r: 39, o: 0.26 },
        { kind: 'circle', cx: 110, cy: 112, r: 26, o: 0.42 },
        { kind: 'circle', cx: 110, cy: 112, r: 14, o: 0.72 },
    ],

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

const DEFAULT_ART: Shape[] = [
    { kind: 'circle', cx: 110, cy: 110, r: 52, o: 0.12 },
    { kind: 'circle', cx: 110, cy: 110, r: 38, o: 0.22 },
    { kind: 'circle', cx: 110, cy: 110, r: 24, o: 0.4 },
    { kind: 'circle', cx: 110, cy: 110, r: 11, o: 0.8 },
];

interface PracticeIllustrationProps {
    /** The practice's stable English name from the catalogue. */
    name: string;
    className?: string;
}

export default function PracticeIllustration({ name, className }: PracticeIllustrationProps) {
    // useId emits colon-wrapped ids; strip them for safe url(#...) references.
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const custom = CUSTOM[name];
    if (custom) {
        return (
            <svg viewBox="0 0 220 220" className={className} aria-hidden="true" role="presentation">
                {custom(uid)}
            </svg>
        );
    }

    const shapes = ART[name] ?? DEFAULT_ART;

    return (
        <svg viewBox="0 0 220 220" className={className} aria-hidden="true" role="presentation">
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
        </svg>
    );
}
