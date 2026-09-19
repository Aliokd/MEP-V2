/**
 * The seal on a golden ticket: an eight-point star with a check in it.
 *
 * Plain SVG so it renders on the server and in an email-sized thumbnail
 * alike. `tone` picks the wall's quiet grey or the ticket's gold.
 */
export default function GoldenBadge({
    size = 96,
    tone = 'gold',
    className = '',
}: {
    size?: number;
    tone?: 'gold' | 'paper';
    className?: string;
}) {
    const fill = tone === 'gold' ? '#E9B94F' : '#D9D9D6';
    const check = tone === 'gold' ? '#1F1F1F' : '#111111';
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
            <path
                d="M50 4 L61 16 L77 12 L80 28 L95 35 L88 50 L95 65 L80 72 L77 88 L61 84 L50 96 L39 84 L23 88 L20 72 L5 65 L12 50 L5 35 L20 28 L23 12 L39 16 Z"
                fill={fill}
                stroke={fill}
                strokeWidth="8"
                strokeLinejoin="round"
            />
            <path
                d="M33 51 L45 63 L68 38"
                stroke={check}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
