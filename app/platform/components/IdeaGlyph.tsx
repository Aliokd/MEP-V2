"use client";

/**
 * Minimal geometric artwork for Bank of tips cards.
 *
 * Sixteen line-art glyphs in one visual family — thin uniform stroke, centred
 * composition, occasional sage-green or gold accent dot. There are far more tips than
 * glyphs, so each tip is mapped onto one by a hash of its id: the pairing is
 * arbitrary but stable, so a given tip always shows the same picture no matter
 * how the deck is filtered or ordered.
 *
 * Strokes use `currentColor`, so the colour comes from the parent's text class.
 */

/** Veinote's own accents — the sage green and gold, not the reference's blue/amber. */
const ACCENT_GREEN = '#86BE7F';
const ACCENT_GOLD = '#C5A059';

/** Points for a regular polygon, used by the hexagon glyphs. */
function polygonPoints(sides: number, radius: number, cx = 60, cy = 60, rotation = -90): string {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((360 / sides) * i + rotation) * (Math.PI / 180);
        return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
}

const GLYPHS: ((key: string) => React.ReactElement)[] = [
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
                const a = (i * (360 / 28)) * (Math.PI / 180);
                const inner = i % 2 === 0 ? 16 : 22;
                const outer = i % 2 === 0 ? 40 : 34;
                return (
                    <line
                        key={i}
                        x1={(60 + inner * Math.cos(a)).toFixed(2)}
                        y1={(60 + inner * Math.sin(a)).toFixed(2)}
                        x2={(60 + outer * Math.cos(a)).toFixed(2)}
                        y2={(60 + outer * Math.sin(a)).toFixed(2)}
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
    () => (
        <>
            <rect x="24" y="24" width="72" height="72" />
            <circle cx="60" cy="60" r="20" strokeDasharray="3 4" />
            <line x1="24" y1="24" x2="96" y2="96" strokeDasharray="3 4" />
            <line x1="96" y1="24" x2="24" y2="96" strokeDasharray="3 4" />
            <circle cx="60" cy="60" r="3.5" fill={ACCENT_GREEN} stroke="none" />
            <circle cx="76" cy="60" r="3" fill={ACCENT_GOLD} stroke="none" />
        </>
    ),
    // 14 — nested orbits
    () => (
        <>
            <circle cx="60" cy="60" r="36" />
            <circle cx="58" cy="62" r="24" strokeDasharray="3 4" />
            <circle cx="56" cy="64" r="14" strokeDasharray="3 4" />
            <circle cx="56" cy="64" r="6" />
            <circle cx="56" cy="64" r="3" fill={ACCENT_GREEN} stroke="none" />
            <circle cx="72" cy="80" r="3" fill={ACCENT_GREEN} stroke="none" />
        </>
    ),
    // 15 — sphere crossed by arcs
    () => (
        <>
            <circle cx="60" cy="60" r="36" />
            <path d="M28 44 C 48 68, 72 84, 94 78" strokeDasharray="3 4" />
            <path d="M34 84 C 54 60, 76 42, 92 40" />
            <circle cx="72" cy="46" r="3.5" fill={ACCENT_GREEN} stroke="none" />
            <circle cx="54" cy="72" r="3" fill={ACCENT_GOLD} stroke="none" />
        </>
    ),
    // 16 — nested hexagons
    () => (
        <>
            <polygon points={polygonPoints(6, 38)} />
            <polygon points={polygonPoints(6, 24)} />
            <circle cx="60" cy="60" r="12" strokeDasharray="3 4" />
            <line x1="60" y1="36" x2="60" y2="60" />
            <circle cx="60" cy="60" r="3" fill={ACCENT_GREEN} stroke="none" />
        </>
    ),
];

/** Stable, order-independent mapping from a tip id onto one of the glyphs. */
function glyphIndexFor(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % GLYPHS.length;
}

interface IdeaGlyphProps {
    /** Tip id — decides which glyph is shown, and keeps it stable. */
    seed: string;
    className?: string;
}

export default function IdeaGlyph({ seed, className }: IdeaGlyphProps) {
    const render = GLYPHS[glyphIndexFor(seed)];

    return (
        <svg
            viewBox="0 0 120 120"
            role="presentation"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            /* The 120-unit viewBox is drawn around 3x that on screen, so the stroke
               is scaled down to keep the hairline weight the style depends on. */
            strokeWidth={0.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {render(seed)}
        </svg>
    );
}
