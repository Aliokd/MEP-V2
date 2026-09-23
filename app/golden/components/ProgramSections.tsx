import { CalendarPlus, Infinity as InfinityIcon, MapPin, Shirt, Sparkles, Ticket, type LucideIcon } from 'lucide-react';
import { GOLDEN } from '../content';
import ProgramShowcase from './ProgramShowcase';
import FoundersSection from './FoundersSection';
import TogetherMap from './TogetherMap';
import ActionVideo from './ActionVideo';

/** One icon per benefit, keyed by the ids in GOLDEN.benefits. */
const BENEFIT_ICONS: Record<(typeof GOLDEN.benefits)[number]['id'], LucideIcon> = {
    lifetime: InfinityIcon,
    vouchers: Ticket,
    events: MapPin,
    host: CalendarPlus,
    // The shirt stays: the tee is the first of the perks.
    perks: Shirt,
};

/**
 * Everything a golden page says that is not about one particular person:
 * what Veinote is, what the ticket holds, the founders, and where the people
 * using it are.
 *
 * Shared by the two pages that lead with a different hero and then say the
 * same thing: a named person's ticket (/golden/{slug}) and one of the tickets
 * nobody holds yet (/golden/ticket/{number}). One copy, so the pitch cannot
 * drift between the invitation and the answer to "what is this?".
 */
export default function ProgramSections() {
    return (
        <>
            {/* What Veinote is, shown rather than described: the four intro
                animations, stacked. They come before the benefits because the
                list of what a ticket holds means more once you have seen the
                thing the ticket is for. */}
            <ProgramShowcase />

            {/* Benefits: one large card each, two to a row, every card the
                same width and height. Five benefits and a sixth card saying
                the list is still growing, so the grid closes evenly at three
                rows. `auto-rows-fr` makes every row as tall as the tallest,
                so a card with a shorter line is not a shorter card. */}
            <section className="px-6 md:px-[10%] pb-20 md:pb-36">
                <div className="border-t border-stone-400/20 pt-16 md:pt-24">
                    <h2 className="text-center text-3xl md:text-5xl tracking-tight">{GOLDEN.benefitsTitle}</h2>
                    <div className="mt-10 grid auto-rows-fr grid-cols-2 gap-3 md:mt-16 md:gap-5">
                        {GOLDEN.benefits.map(({ id, text }) => {
                            const Icon = BENEFIT_ICONS[id];
                            return (
                                <div
                                    key={id}
                                    className="flex flex-col gap-5 rounded-[24px] border border-stone-300/50 bg-white/45 p-5 md:min-h-[220px] md:gap-8 md:rounded-[28px] md:p-10"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6E3DB] text-stone-800 md:h-16 md:w-16 md:rounded-[20px]">
                                        <Icon className="h-6 w-6 md:h-8 md:w-8" strokeWidth={1.5} />
                                    </div>
                                    <p className="max-w-[28ch] text-[15px] font-semibold leading-snug tracking-tight md:text-2xl md:leading-snug">{text}</p>
                                </div>
                            );
                        })}
                        {/* Drawn a step quieter, a dashed edge and softer ink,
                            so it reads as a promise rather than a sixth thing
                            already in the box. */}
                        <div className="flex flex-col gap-5 rounded-[24px] border border-dashed border-stone-400/60 bg-white/20 p-5 md:min-h-[220px] md:gap-8 md:rounded-[28px] md:p-10">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6E3DB]/70 text-stone-600 md:h-16 md:w-16 md:rounded-[20px]">
                                <Sparkles className="h-6 w-6 md:h-8 md:w-8" strokeWidth={1.5} />
                            </div>
                            <p className="max-w-[28ch] text-[15px] font-semibold leading-snug tracking-tight text-stone-600 md:text-2xl md:leading-snug">
                                {GOLDEN.benefitsMore}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The founders, in their own words */}
            <FoundersSection />

            {/* Together: the globe from Connect, rather than two cards
                describing it. The pins are examples — see TogetherMap. */}
            <section className="px-6 md:px-[10%] pb-20 md:pb-36">
                {/* Styled as the film's heading below it: both sit over a
                    full-width picture rather than beside a paragraph. */}
                <h2 className="text-center text-3xl md:text-5xl tracking-tight">{GOLDEN.togetherTitle}</h2>
                <div className="mt-10 md:mt-16">
                    <TogetherMap />
                </div>
            </section>

            {/* The film. Same 80% column as the map above it, so the two read
                as one run rather than two widths. */}
            <section className="px-6 md:px-[10%] pb-20 md:pb-36">
                {/* Centred and larger than the other section headings: this one
                    sits over the film rather than beside a paragraph, and a
                    left-aligned line above a full-width frame reads as a label
                    for something to its right that is not there. */}
                <h2 className="text-center text-3xl md:text-5xl tracking-tight">{GOLDEN.videoTitle}</h2>
                {/* Four fifths of the column on a desk, centred. The still is a
                    YouTube JPEG of a screen recording, and a recording of a
                    screen is soft to begin with; drawn smaller than its own
                    pixels it reads sharp instead of enlarged. Full width on a
                    phone, where the column is already narrower than the file. */}
                <div className="mx-auto mt-10 w-full md:mt-16 md:w-4/5">
                    <ActionVideo />
                </div>
            </section>
        </>
    );
}
