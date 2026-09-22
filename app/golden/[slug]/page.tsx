import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { getTicket } from '@/lib/goldenTickets';
import GoldenBadge from '../components/GoldenBadge';
import TakeTicket from '../components/TakeTicket';
import ProgramSections from '../components/ProgramSections';
import { GOLDEN, firstName } from '../content';

/**
 * One songwriter's page: the ticket with their name on it, what it holds,
 * what Veinote is for, and the form that takes it. Server-rendered from the
 * Admin SDK; the browser receives the public fields and nothing else (the
 * code and any address on file stay on the server).
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug } = await params;
    const ticket = await getTicket(slug);
    const title = ticket ? `${ticket.name}, your golden ticket | Veinote` : `${GOLDEN.programName} | Veinote`;
    return {
        title,
        description: GOLDEN.wallSubtitle,
        robots: { index: false, follow: false },
        openGraph: {
            title,
            description: GOLDEN.wallSubtitle,
            ...(ticket?.photoUrl ? { images: [{ url: ticket.photoUrl }] } : {}),
        },
    };
}

export default async function GoldenTicketPage({ params }: { params: Params }) {
    const { slug } = await params;
    const ticket = await getTicket(slug);
    if (!ticket) notFound();

    const name = firstName(ticket.name);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans text-stone-900">
            {/* The page's own header: where it came from, and the one thing to do. */}
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
                        <span>{GOLDEN.cta}</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                    </a>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-12 md:pt-20 pb-14 px-6 md:px-[10%]">
                <div className="max-w-3xl">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-[24px] overflow-hidden bg-[#DCDDD4] border border-stone-900/5">
                            {ticket.photoUrl ? (
                                <img src={ticket.photoUrl} alt={ticket.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-light text-stone-900/20 select-none">
                                    {ticket.name.trim().charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <GoldenBadge size={56} tone="gold" className="absolute -top-4 -right-5 drop-shadow-sm" />
                    </div>

                    <p className="mt-8 text-xs text-stone-500 tabular-nums">
                        {GOLDEN.programName} · Ticket {ticket.number}
                    </p>
                    <h1 className="mt-3 text-4xl md:text-6xl leading-[1.08] tracking-tight font-light">
                        {renderHero(GOLDEN.heroTitle, name)}
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">{GOLDEN.heroBody}</p>
                    {ticket.note && (
                        <blockquote className="mt-8 border-l-2 border-[#C5A059] pl-5 text-stone-700 leading-relaxed max-w-2xl">
                            {ticket.note}
                        </blockquote>
                    )}
                </div>
            </section>

            <ProgramSections />

            {/* The ticket */}
            <section className="px-6 md:px-[10%] pb-10">
                <div className="max-w-2xl mx-auto">
                    <TakeTicket slug={ticket.slug} status={ticket.status} />
                    <p className="mt-6 text-center text-xs text-stone-500">
                        {GOLDEN.footnotePhotos}{' '}
                        <Link href="/terms" className="underline underline-offset-2 hover:text-stone-800">{GOLDEN.footnoteTerms}</Link>
                    </p>
                </div>
            </section>

            <SiteFooterStrip language="en" currentPath={`/golden/${ticket.slug}`} />
        </div>
    );
}

/** "Hey {name}, ..." with the name in bold, the signature display style. */
function renderHero(template: string, name: string) {
    const [before, after] = template.split('{name}');
    return (
        <>
            {before}
            <span className="font-semibold">{name}</span>
            {after}
        </>
    );
}
