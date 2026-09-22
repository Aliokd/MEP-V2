import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { listTickets } from '@/lib/goldenTickets';
import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';
import TicketArt from '../../components/TicketArt';
import GoldenBadge from '../../components/GoldenBadge';
import ProgramSections from '../../components/ProgramSections';
import AskForTicket from '../../components/AskForTicket';
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
                    <a
                        href="#ticket"
                        className="btn-press shrink-0 px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold inline-flex items-center gap-2 select-none"
                    >
                        <span>{GOLDEN.free.askCta}</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                    </a>
                </div>
            </header>

            {/* Hero: the ticket itself, with nobody's name on it.

                It holds the screen on its own. `min-h` against the viewport
                less the header means the first thing a visitor sees is the
                ticket and what it is, and the sections below are something
                they choose to scroll to rather than something crowding the
                headline. Capped, so a tall desktop window does not leave the
                text stranded in the middle of an empty field. */}
            <section className="flex min-h-[calc(100svh-96px)] max-h-[900px] items-center px-6 pb-16 pt-10 md:px-[10%] md:pb-24 md:pt-14">
                <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
                    <div className="max-w-3xl">
                        <GoldenBadge size={72} tone="gold" />
                        <p className="mt-8 text-xs text-stone-500 tabular-nums">
                            {GOLDEN.free.eyebrow} · Ticket {n} of {GOLDEN_TICKETS_TOTAL}
                        </p>
                        <h1 className="mt-3 text-4xl md:text-6xl leading-[1.08] tracking-tight font-light">
                            {GOLDEN.free.title}
                        </h1>
                        <p className="mt-6 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">{GOLDEN.free.body}</p>
                    </div>

                    {/* The ticket being offered, drawn rather than described.
                        `issued={false}` is the point of this page: the number is
                        quieter and the paper paler, because nobody's name is on
                        it yet.

                        `relative` and the ticket's own 400x240 ratio are both
                        required, not styling: TicketArt draws itself `absolute
                        inset-0` with `preserveAspectRatio="none"`, so it fills
                        whatever box it is given and stretches to any shape that
                        box happens to be. Without a positioned parent it escapes
                        to the nearest one and spans the page. */}
                    <div className="relative mx-auto aspect-[400/240] w-full max-w-[460px] lg:mx-0 lg:max-w-[520px]">
                        <TicketArt number={n} issued={false} id={`hero-${n}`} />
                    </div>
                </div>
            </section>

            <ProgramSections />

            {/* The ask */}
            <section className="px-6 md:px-[10%] pb-10">
                <div className="max-w-2xl mx-auto">
                    <AskForTicket number={n} />
                    <p className="mt-6 text-center text-xs text-stone-500">
                        {GOLDEN.footnotePhotos}{' '}
                        <Link href="/terms" className="underline underline-offset-2 hover:text-stone-800">{GOLDEN.footnoteTerms}</Link>
                    </p>
                </div>
            </section>

            <SiteFooterStrip language="en" currentPath={`/golden/ticket/${n}`} />
        </div>
    );
}
