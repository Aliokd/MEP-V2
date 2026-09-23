import { Shirt, Ticket } from 'lucide-react';
import { GOLDEN } from '../content';
import ProgramShowcase from './ProgramShowcase';
import FoundersSection from './FoundersSection';
import TogetherMap from './TogetherMap';
import ActionVideo from './ActionVideo';

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

            {/* Benefits */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-14 border-t border-stone-400/20 pt-14">
                    <div>
                        <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.benefitsTitle}</h2>
                        <ul className="mt-6 space-y-3.5">
                            {GOLDEN.benefits.map((line) => (
                                <li key={line} className="flex items-start gap-3 text-stone-700 leading-relaxed">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#C5A059] shrink-0" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {GOLDEN.perks.map((perk) => (
                            <div key={perk.id} className="bg-white/45 border border-stone-300/50 rounded-[24px] p-5 md:p-6 flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#E6E3DB] flex items-center justify-center text-stone-800">
                                    {perk.id === 'tee' ? <Shirt className="w-6 h-6" strokeWidth={1.6} /> : <Ticket className="w-6 h-6" strokeWidth={1.6} />}
                                </div>
                                <div>
                                    <p className="font-semibold">{perk.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* The founders, in their own words */}
            <FoundersSection />

            {/* Together: the globe from Connect, rather than two cards
                describing it. The pins are examples — see TogetherMap. */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
                {/* Styled as the film's heading below it: both sit over a
                    full-width picture rather than beside a paragraph. */}
                <h2 className="text-center text-3xl md:text-5xl tracking-tight">{GOLDEN.togetherTitle}</h2>
                <div className="mt-8 md:mt-10">
                    <TogetherMap />
                </div>
            </section>

            {/* The film. Same 80% column as the map above it, so the two read
                as one run rather than two widths. */}
            <section className="px-6 md:px-[10%] pb-16 md:pb-24">
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
                <div className="mx-auto mt-8 w-full md:mt-10 md:w-4/5">
                    <ActionVideo />
                </div>
            </section>
        </>
    );
}
