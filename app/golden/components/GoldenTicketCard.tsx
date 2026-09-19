import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PublicGoldenTicket } from '@/lib/goldenTickets';
import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';

/**
 * One golden ticket on the wall.
 *
 * The ticket is drawn in SVG: a gold body with a torn-off stub on the right,
 * the notches a real ticket has where it was held in a roll, the Veinote
 * wordmark watermarked into the paper, and the number stamped large. The
 * name, the tagline and the photo sit in HTML over it so long names wrap
 * and clamp the way text should.
 *
 * An issued ticket (a person on it) is a link to their page. An empty slot
 * is the same ticket unissued: paler paper, the number, the watermark, and
 * nothing to press.
 */

/** The page's paper colour, which the notches are "cut" with. */
const PAPER = '#E6E3DB';
const W = 400;
const H = 240;
const STUB_X = 296;
const NOTCH_R = 13;
const RADIUS = 18;

function pad(number: number): string {
    return String(number).padStart(String(GOLDEN_TICKETS_TOTAL).length, '0');
}

function TicketArt({ number, issued, id }: { number: number; issued: boolean; id: string }) {
    const gradientId = `gold-${id}`;
    const sheenId = `sheen-${id}`;
    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    {issued ? (
                        <>
                            <stop offset="0" stopColor="#F3CF6F" />
                            <stop offset="0.55" stopColor="#E3B54A" />
                            <stop offset="1" stopColor="#C9973A" />
                        </>
                    ) : (
                        <>
                            <stop offset="0" stopColor="#EFDDA8" />
                            <stop offset="1" stopColor="#E1C67F" />
                        </>
                    )}
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
            <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx={RADIUS} fill={`url(#${sheenId})`} opacity={issued ? 1 : 0.5} />
            {/* Inner hairline, the printed border of a ticket */}
            <rect x="9" y="9" width={W - 18} height={H - 18} rx={RADIUS - 8} fill="none" stroke="#1F1F1F" strokeOpacity={issued ? 0.22 : 0.14} strokeWidth="1" />

            {/* The wordmark, printed into the paper. Ink at low opacity reads as
                a watermark on gold; the same file the site's footer offers. */}
            <image
                href="/assets/brand/veinote-wordmark-ink.svg"
                x="28"
                y="86"
                width="240"
                height="62"
                opacity={issued ? 0.16 : 0.13}
                preserveAspectRatio="xMinYMid meet"
            />

            {/* The stub: a dashed tear line and the notches on the edge. */}
            <line x1={STUB_X} y1="12" x2={STUB_X} y2={H - 12} stroke="#1F1F1F" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="5 5" />
            <circle cx={STUB_X} cy="0" r={NOTCH_R} fill={PAPER} />
            <circle cx={STUB_X} cy={H} r={NOTCH_R} fill={PAPER} />

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
                fill="#1F1F1F"
                fillOpacity={issued ? 0.85 : 0.35}
            >
                {pad(number)}
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
                fill="#1F1F1F"
                fillOpacity={issued ? 0.55 : 0.3}
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
                fill="#1F1F1F"
                fillOpacity={issued ? 0.6 : 0.35}
            >
                {issued ? `Veinote · Ticket ${number} of ${GOLDEN_TICKETS_TOTAL}` : `Ticket ${number} of ${GOLDEN_TICKETS_TOTAL}`}
            </text>
        </svg>
    );
}

export function GoldenTicketCard({ ticket }: { ticket: PublicGoldenTicket }) {
    return (
        <Link
            href={`/golden/${ticket.slug}`}
            className="group relative block aspect-[5/3] rounded-[18px] overflow-hidden shadow-[0_10px_30px_-12px_rgba(120,90,20,0.45)] transition-transform duration-300 hover:-translate-y-1"
        >
            <TicketArt number={ticket.number} issued id={ticket.slug} />

            {/* The person: photo, name, tagline, over the body of the ticket. */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-end p-[6.5%] pr-0" style={{ width: `${(STUB_X / W) * 100}%` }}>
                <div className="flex items-end gap-3">
                    <div className="w-[26%] max-w-[64px] aspect-square rounded-full overflow-hidden border-2 border-white/70 bg-[#F6E7BF] shrink-0 shadow-sm">
                        {ticket.photoUrl ? (
                            <img src={ticket.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-light text-stone-900/40 select-none">
                                {ticket.name.trim().charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 pb-0.5">
                        <p className="text-stone-900 text-[15px] md:text-[17px] font-semibold leading-tight line-clamp-2">{ticket.name}</p>
                        {ticket.tagline && (
                            <p className="text-stone-900/65 text-[11px] md:text-[12px] leading-snug mt-0.5 line-clamp-1">{ticket.tagline}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute top-[7%] right-[29%] w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 stroke-[2.2px]" />
            </div>
        </Link>
    );
}

export function EmptyTicketSlot({ number }: { number: number }) {
    return (
        <div aria-hidden="true" className="relative aspect-[5/3] rounded-[18px] overflow-hidden opacity-80">
            <TicketArt number={number} issued={false} id={`slot-${number}`} />
        </div>
    );
}
