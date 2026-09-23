import { GOLD } from '../goldPalette';

/**
 * The seal on a golden ticket: an eight-point star with a check in it.
 *
 * Plain SVG so it renders on the server and in an email-sized thumbnail alike.
 *
 * Gold, always. It had a `paper` tone once, a quiet grey worn at the head of
 * the wall, which put the program's own mark in the one colour the program is
 * not. A check mark here means a ticket, and a ticket is gold.
 */
export default function GoldenBadge({
    size = 96,
    className = '',
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="golden-badge-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={GOLD.bright} />
                    <stop offset="0.55" stopColor={GOLD.mid} />
                    <stop offset="1" stopColor={GOLD.deep} />
                </linearGradient>
            </defs>
            <path
                d="M50 4 L61 16 L77 12 L80 28 L95 35 L88 50 L95 65 L80 72 L77 88 L61 84 L50 96 L39 84 L23 88 L20 72 L5 65 L12 50 L5 35 L20 28 L23 12 L39 16 Z"
                fill="url(#golden-badge-fill)"
                stroke={GOLD.mid}
                strokeWidth="8"
                strokeLinejoin="round"
            />
            <path
                d="M33 51 L45 63 L68 38"
                stroke="#1F1F1F"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
