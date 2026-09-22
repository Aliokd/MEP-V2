import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PublicGoldenTicket } from '@/lib/goldenTickets';
import { GOLDEN } from '../content';
import TicketArt from './TicketArt';
import { STUB_X, W } from './ticketShape';

/**
 * One golden ticket on the wall.
 *
 * The ticket is drawn in SVG: a gold body with a torn-off stub on the right,
 * the notches a real ticket has where it was held in a roll, the Veinote
 * wordmark watermarked into the paper, and the number stamped large. The
 * name, the tagline and the photo sit in HTML over it so long names wrap
 * and clamp the way text should.
 *
 * An open ticket (a person on it, not yet taken) is bright and is a link to
 * their page. A ticket already taken (claimed or redeemed) stays on the wall
 * with the name on it but steps back: dimmer and nothing to press, so a
 * newcomer sees who came in before them and that the free ones are the lit
 * ones. A slot with nobody on it is a full-gold ticket marked Available,
 * leading to the program page.
 *
 * The drawing itself lives in TicketArt, shared with the admin console's
 * wall, so the hundred look like the same hundred in both places.
 */

export function GoldenTicketCard({ ticket }: { ticket: PublicGoldenTicket }) {
    const taken = ticket.status === 'claimed' || ticket.status === 'redeemed';
    const body = (
        <>
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

            {!taken && (
                <div className="absolute top-[7%] right-[29%] w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 stroke-[2.2px]" />
                </div>
            )}
        </>
    );

    if (taken) {
        return (
            <div
                role="img"
                aria-label={`Ticket ${ticket.number}, taken by ${ticket.name}`}
                className="relative aspect-[5/3] rounded-[18px] overflow-hidden opacity-55 saturate-[0.85] cursor-default select-none"
            >
                {body}
            </div>
        );
    }

    return (
        <Link
            href={`/golden/${ticket.slug}`}
            aria-label={`Ticket ${ticket.number}, ${ticket.name}`}
            className="group relative block aspect-[5/3] rounded-[18px] overflow-hidden shadow-[0_10px_30px_-12px_rgba(120,90,20,0.45)] transition-transform duration-300 hover:-translate-y-1"
        >
            {body}
        </Link>
    );
}

/**
 * A ticket with nobody's name on it: full gold, and the one kind of card on
 * the wall that anybody can press. It leads to the program page, which says
 * what the ticket holds and how to ask for it.
 */
export function EmptyTicketSlot({ number }: { number: number }) {
    return (
        <Link
            href={`/golden/ticket/${number}`}
            aria-label={`Golden ticket ${number}, still available`}
            className="group relative block aspect-[5/3] rounded-[18px] overflow-hidden shadow-[0_10px_30px_-12px_rgba(120,90,20,0.45)] transition-transform duration-300 hover:-translate-y-1"
        >
            <TicketArt number={number} issued id={`slot-${number}`} />

            <div className="absolute inset-y-0 left-0 flex flex-col justify-end p-[6.5%] pr-0" style={{ width: `${(STUB_X / W) * 100}%` }}>
                <p className="text-stone-900/70 text-[13px] md:text-[15px] font-semibold leading-tight">{GOLDEN.wallAvailable}</p>
            </div>

            <div className="absolute top-[7%] right-[29%] w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 stroke-[2.2px]" />
            </div>
        </Link>
    );
}
