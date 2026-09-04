"use client";

interface VerifiedMarkProps {
    /** Pixel size of the seal. Defaults to sit beside body-sized text. */
    size?: number;
    label: string;
    className?: string;
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
export default function VerifiedMark({ size = 16, label, className = '' }: VerifiedMarkProps) {
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
                fill="#1c1917"
                stroke="#1c1917"
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
            <path
                d="M7.6 12.4l3 3 5.8-6.2"
                fill="none"
                stroke="#FAF9F5"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
