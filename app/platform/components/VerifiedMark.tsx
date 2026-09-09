"use client";

interface VerifiedMarkProps {
    /** Pixel size of the seal. Defaults to sit beside body-sized text. */
    size?: number;
    label: string;
    className?: string;
    /**
     * `ink` (default): ink seal, paper check — the mark as it sits beside a name
     * on a light surface. `paper`: the inverse, a white seal with a dark-grey
     * check, for the one place it appears on a dark ground (the celebration).
     */
    tone?: 'ink' | 'paper';
}

/**
 * The rosette is computed, not hand-drawn: sixteen vertices alternating between
 * an outer and an inner radius, evenly spaced around the centre. A hand-typed
 * version of this shape looked lumpy at small sizes because no eyeballed
 * coordinate lands exactly on the circle — this one cannot be uneven.
 *
 * The shallow difference between the two radii is what makes it a scalloped
 * seal rather than a spiky star; the round stroke join softens each point.
 */
const POINTS = 8;
const OUTER = 10.6;
const INNER = 8.9;
const ROSETTE_PATH = Array.from({ length: POINTS * 2 }, (_, i) => {
    const r = i % 2 === 0 ? OUTER : INNER;
    // Start at the top so a point, not a valley, sits at 12 o'clock.
    const angle = (Math.PI * 2 * i) / (POINTS * 2) - Math.PI / 2;
    const x = (12 + r * Math.cos(angle)).toFixed(2);
    const y = (12 + r * Math.sin(angle)).toFixed(2);
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
}).join(' ') + ' Z';

/**
 * The verified seal, drawn once here so it is the same shape at 15px in a list
 * row and 22px in a profile header. Inline SVG rather than an icon glyph: the
 * scalloped edge has to stay crisp when small, and the fill is the platform's
 * ink colour, not a library's.
 */
export default function VerifiedMark({ size = 16, label, className = '', tone = 'ink' }: VerifiedMarkProps) {
    const seal = tone === 'paper' ? '#FFFFFF' : '#1c1917';
    const check = tone === 'paper' ? '#363636' : '#FAF9F5';
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            role="img"
            aria-label={label}
            className={`inline-block shrink-0 align-[-0.15em] ${className}`}
        >
            <title>{label}</title>
            <path
                d={ROSETTE_PATH}
                fill={seal}
                stroke={seal}
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
            {/* The check: rounded at text size, where soft ends read as friendly at
                16px; square-cut and mitred on the big paper seal, where round ends
                looked like a marker stroke. */}
            <path
                d="M7.6 12.4l3 3 5.8-6.2"
                fill="none"
                stroke={check}
                strokeWidth="2.3"
                strokeLinecap={tone === 'paper' ? 'butt' : 'round'}
                strokeLinejoin={tone === 'paper' ? 'miter' : 'round'}
            />
        </svg>
    );
}
