import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { listTickets } from '@/lib/goldenTickets';
import { proYearlyPrice } from '@/lib/paddle/proYearlyPrice';
import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';
import ProgramSections from '../../components/ProgramSections';
import AskForTicket from '../../components/AskForTicket';
import GoldenHeroActions from '../../components/GoldenHeroActions';
import { LEARN_MORE_ANCHOR } from '../../activateEvent';
import { GOLDEN } from '../../content';

/**
 * One of the tickets nobody holds yet.
 *
 * The wall draws all hundred slots. Twenty-five have a songwriter on them and
 * lead to that person's page; the rest lead here, so a visitor who presses a
 * ticket still lands on the whole pitch rather than on nothing. Same sections
 * as a named page, different hero and different ask: there is no name on this
 * ticket, and the way to get one is to be chosen.
 *
 * A number that has since been given away redirects to the page of whoever
 * holds it, so a link shared while the ticket was open never dead-ends.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ number: string }>;

function parseNumber(raw: string): number | null {
    if (!/^\d{1,3}$/.test(raw)) return null;
    const n = Number(raw);
    return n >= 1 && n <= GOLDEN_TICKETS_TOTAL ? n : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { number } = await params;
    const n = parseNumber(number);
    return {
        title: n ? `Golden ticket ${n} | Veinote` : `${GOLDEN.programName} | Veinote`,
        description: GOLDEN.free.body,
        robots: { index: false, follow: false },
    };
}

export default async function FreeTicketPage({ params }: { params: Params }) {
    const { number } = await params;
    const n = parseNumber(number);
    if (n === null) notFound();

    // Taken between the wall rendering and this click, or a stale link.
    const held = (await listTickets()).find((t) => t.number === n && t.status !== 'revoked');
    if (held) redirect(`/golden/${held.slug}`);

    // What the card strikes through: a year of Veinote Pro, as Paddle has it.
    const price = await proYearlyPrice();

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans text-stone-900">
            <header className="sticky top-0 z-40 bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/20">
                <div className="px-5 md:px-[10%] py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <Link href="/" className="inline-block hover:opacity-80 transition-opacity [&_svg]:w-[84px] md:[&_svg]:w-[104px]">
                            <Logo size="lg" />
                        </Link>
                        <Link href="/golden" className="mt-1 flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="truncate">{GOLDEN.backLabel}</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero: what this ticket is, and the two ways on.

                Only the words and the choice. The ticket drawing, the seal and
                the headline went: they said "golden ticket" three times before
                the paragraph said what one is. It still holds the first screen
                on its own, centred, so the sections below are something the
                visitor chooses to scroll to. */}
            <section className="flex min-h-[calc(100svh-96px)] max-h-[900px] items-center justify-center px-6 pb-16 pt-10 md:px-[10%] md:pb-20 md:pt-14">
                <div className="mx-auto max-w-2xl text-center">
                    <h1 className="text-5xl leading-[1.05] tracking-tight font-light md:text-7xl">
                        {GOLDEN.free.heading}
                    </h1>
                    <p className="mt-5 text-xs text-stone-500 tabular-nums md:mt-6">
                        {GOLDEN.free.eyebrow} · Ticket {n} of {GOLDEN_TICKETS_TOTAL}
                    </p>
                    <p className="mt-5 text-xl leading-relaxed text-stone-700 md:text-2xl md:leading-relaxed">
                        {GOLDEN.free.body}
                    </p>
                    <div className="mt-10 md:mt-12">
                        <GoldenHeroActions />
                    </div>
                </div>
            </section>

            {/* Where Learn more lands. The margin keeps the section's first line
                clear of the sticky header. */}
            <div id={LEARN_MORE_ANCHOR} className="scroll-mt-24">
                <ProgramSections />
            </div>

            {/* The ask */}
            <section className="px-6 md:px-[10%] pb-20 md:pb-28">
                <div className="max-w-2xl mx-auto">
                    <AskForTicket number={n} price={price} />
                </div>
            </section>

            <SiteFooterStrip language="en" currentPath={`/golden/ticket/${n}`} />
        </div>
    );
}
