import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/Logo';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { listPublicTickets, type PublicGoldenTicket } from '@/lib/goldenTickets';
import { GOLDEN_TICKETS_TOTAL } from '@/lib/uiFlags';
import GoldenBadge from './components/GoldenBadge';
import { GoldenTicketCard, EmptyTicketSlot } from './components/GoldenTicketCard';
import { GOLDEN } from './content';

/**
 * The wall: a hundred slots, the chosen songwriters on them, each a door to
 * their own page. Rendered on the server from the Admin SDK (the collection
 * is closed to browsers), fresh on every request so a ticket added in the
 * console is on the wall the moment it is saved.
 *
 * Kept out of the index: the pages are links sent to named people.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: `${GOLDEN.programName} | Veinote`,
    description: GOLDEN.wallSubtitle,
    robots: { index: false, follow: false },
};

export default async function GoldenWallPage() {
    const tickets = await listPublicTickets();
    const bySlot = new Map<number, PublicGoldenTicket>();
    tickets.forEach((t) => bySlot.set(t.number, t));
    const slots = Array.from({ length: GOLDEN_TICKETS_TOTAL }, (_, i) => i + 1);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans text-stone-900">
            <section className="pt-16 md:pt-24 pb-12 px-6 md:px-[10%] flex flex-col items-center text-center">
                <GoldenBadge size={96} tone="paper" />
                <Link href="/" className="mt-6 hover:opacity-80 transition-opacity [&_svg]:w-[150px] md:[&_svg]:w-[190px]">
                    <Logo size="lg" />
                </Link>
                <h1 className="mt-4 text-3xl md:text-4xl font-normal tracking-tight">{GOLDEN.wallTitle}</h1>
                <p className="mt-3 text-sm md:text-base text-stone-600 max-w-md">{GOLDEN.wallSubtitle}</p>
            </section>

            <section className="px-4 md:px-[8%] pb-24">
                {/* Landscape tickets: two across on a phone, four on a desk. */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                    {slots.map((n) => {
                        const ticket = bySlot.get(n);
                        return ticket ? <GoldenTicketCard key={n} ticket={ticket} /> : <EmptyTicketSlot key={n} number={n} />;
                    })}
                </div>
            </section>

            <SiteFooterStrip language="en" currentPath="/golden" />
        </div>
    );
}
