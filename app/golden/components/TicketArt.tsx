import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';
import { BODY, CUT, H, MARK, NOTCH_R, padTicketNumber, RADIUS, STUB_X, W, type TicketTone } from './ticketShape';

/**
 * The ticket itself, drawn in SVG: a body with a torn-off stub on the right,
 * the notches a real ticket has where it was held in a roll, the Veinote
 * wordmark watermarked into the paper, and the number stamped large up the
 * stub.
 *
 * Two tones, one shape. `gold` is the public wall on its paper background.
 * `ink` is the same ticket in the admin console, which is dark by
 * construction, so a gold card would glare out of it; the console shows a
 * black ticket with the gold kept for the number and the edge. Drawing both
 * from one component is what keeps the console's hundred and the website's
 * hundred recognisably the same object.
 *
 * `issued` is the difference between a ticket with somebody on it and an
 * empty place: an unissued one is paler and its number is quieter.
 */

export default function TicketArt({
    number,
    issued,
    id,
    tone = 'gold',
}: {
    number: number;
    issued: boolean;
    id: string;
    tone?: TicketTone;
}) {
    const gradientId = `ticket-${tone}-${id}`;
    const sheenId = `sheen-${tone}-${id}`;
    const stops = issued ? BODY[tone].issued : BODY[tone].empty;
    const mark = MARK[tone];
    // On paper the print is ink at partial strength; on a black ticket the
    // same marks are gold, and gold needs less of it to read.
    const strong = tone === 'gold' ? (issued ? 0.85 : 0.35) : issued ? 0.9 : 0.4;
    const quiet = tone === 'gold' ? (issued ? 0.55 : 0.3) : issued ? 0.6 : 0.3;
    const faint = tone === 'gold' ? (issued ? 0.6 : 0.35) : issued ? 0.55 : 0.3;
    const edge = tone === 'gold' ? (issued ? 0.22 : 0.14) : issued ? 0.35 : 0.2;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    {stops.map((color, i) => (
                        <stop key={color + i} offset={i / (stops.length - 1)} stopColor={color} />
                    ))}
                </linearGradient>
                <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                    <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.22" />
                    <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.28" />
                    <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Paper */}
            <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx={RADIUS} fill={`url(#${gradientId})`} />
            <rect
                x="0.5"
                y="0.5"
                width={W - 1}
                height={H - 1}
                rx={RADIUS}
                fill={`url(#${sheenId})`}
                opacity={tone === 'ink' ? 0.06 : issued ? 1 : 0.5}
            />
            {/* The printed border of a ticket */}
            <rect x="9" y="9" width={W - 18} height={H - 18} rx={RADIUS - 8} fill="none" stroke={mark} strokeOpacity={edge} strokeWidth="1" />

            {/* The wordmark, printed into the paper. Two files rather than one
                recoloured: each carries its own fill, and the white one over a
                black ticket reads the way the ink one reads over gold. */}
            <image
                href={tone === 'gold' ? '/assets/brand/veinote-wordmark-ink.svg' : '/assets/brand/veinote-wordmark-white.svg'}
                x="28"
                y="86"
                width="240"
                height="62"
                opacity={tone === 'gold' ? (issued ? 0.16 : 0.13) : issued ? 0.14 : 0.08}
                preserveAspectRatio="xMinYMid meet"
            />

            {/* The stub: a dashed tear line and the notches on the edge. */}
            <line x1={STUB_X} y1="12" x2={STUB_X} y2={H - 12} stroke={mark} strokeOpacity={tone === 'ink' ? 0.4 : 0.3} strokeWidth="1.2" strokeDasharray="5 5" />
            <circle cx={STUB_X} cy="0" r={NOTCH_R} fill={CUT[tone]} />
            <circle cx={STUB_X} cy={H} r={NOTCH_R} fill={CUT[tone]} />

            {/* The number, stamped on the stub, reading up the ticket. */}
            <text
                x={(STUB_X + W) / 2}
                y={H / 2}
                transform={`rotate(-90 ${(STUB_X + W) / 2} ${H / 2})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-app), Helvetica, Arial, sans-serif"
                fontWeight="600"
                fontSize="44"
                letterSpacing="2"
                fill={mark}
                fillOpacity={strong}
            >
                {padTicketNumber(number)}
            </text>
            <text
                x={STUB_X + 18}
                y={H / 2}
                transform={`rotate(-90 ${STUB_X + 18} ${H / 2})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-app), Helvetica, Arial, sans-serif"
                fontWeight="500"
                fontSize="11"
                letterSpacing="1.5"
                fill={mark}
                fillOpacity={quiet}
            >
                Golden ticket
            </text>

            {/* Admit-one line on the body, top left. */}
            <text
                x="26"
                y="34"
                fontFamily="var(--font-app), Helvetica, Arial, sans-serif"
                fontWeight="500"
                fontSize="12"
                letterSpacing="0.5"
                fill={mark}
                fillOpacity={faint}
            >
                {issued ? `Veinote · Ticket ${number} of ${GOLDEN_TICKETS_TOTAL}` : `Ticket ${number} of ${GOLDEN_TICKETS_TOTAL}`}
            </text>
        </svg>
    );
}
