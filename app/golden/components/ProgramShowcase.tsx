"use client";

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { SLIDE_ART, SlideCard, slideArtInnerClass } from '@/app/onboarding/components/IntroCarousel';
import GoldenMindLoop from './GoldenMindLoop';
import { GOLDEN } from '../content';

/**
 * The four intro slides, stacked down the Golden page.
 *
 * These are the carousel's own cards, not a version of them: same cream
 * surface, same painted backdrop, same mark and headline, same art in the same
 * box. Anything redrawn here would be a second copy to keep in step with the
 * first, and the first is full of detail that is easy to get subtly wrong.
 *
 * The carousel shows one at a time behind a Next button; a golden page has no
 * button and nobody has agreed to sit through five steps, so they stack and the
 * demos play as a reader reaches them.
 *
 * `modern_way` is deliberately absent: it is the carousel's opening argument
 * ("here is why this exists"), which a golden page has already made in its hero
 * by the time a reader gets this far.
 *
 * The fourth card is not a slide at all. The carousel's science step makes its
 * case in set text; here the same claim is made by showing the thing, with the
 * brain filling, turning gold and then naming its six regions, and the finding
 * and its source underneath.
 */
const SHOWCASE = ['collab', 'tools', 'publish'] as const;

/**
 * This card's ground: white at a third strength, so the page's beige comes through
 * and the card sits a shade above it rather than as a separate white object.
 *
 * Safe here in a way it would not be on the carousel's cards, whose note warns
 * against exactly this: those sit on a painted backdrop, where a translucent
 * wash picks up whatever image happens to be behind it. The Golden page's
 * ground is flat #E6E3DB, so this composites to one predictable colour.
 */
const CARD_BG = 'rgba(255, 255, 255, 0.3)';

/**
 * Each demo starts when its section is actually reached, and keeps running.
 *
 * Starting on arrival rather than on page load is the point: these are films,
 * and a film that has been playing to nobody since the top of the page is half
 * over by the time it is looked at. It also keeps four framer-motion timelines,
 * a requestAnimationFrame camera tour and several hundred animated nodes from
 * all running at once on a phone for the sake of cards that are off screen.
 *
 * Staying on afterwards is on purpose. Stopping on the way back up would restart
 * every loop from frame zero, so scrolling past a demo twice would show two
 * different moments of it and read as a glitch.
 */
function useNearViewport<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [near, setNear] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // No IntersectionObserver (or an old browser): show the art rather than
        // an empty box. A heavier page beats a page with holes in it.
        if (typeof IntersectionObserver === 'undefined') {
            setNear(true);
            return;
        }

        let timer: ReturnType<typeof setTimeout> | null = null;
        let heardFromObserver = false;

        const reveal = () => {
            setNear(true);
            observer.disconnect();
            if (timer) clearTimeout(timer);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                // Any callback at all proves the observer works here, which is
                // what the timer below is guarding against. It fires once on
                // observe with the current state, so this is set immediately in
                // a healthy page whether or not the card is in view.
                heardFromObserver = true;
                if (entries.some((entry) => entry.isIntersecting)) reveal();
            },
            // A fifth of the card in view: enough that the reader has arrived at
            // the section, rather than the card's top edge grazing the fold.
            { threshold: 0.2 },
        );
        observer.observe(el);

        // The guard, not the trigger. Somewhere with no layout to speak of — a
        // tab that has never been painted, a zero-height container, an embedded
        // preview — the observer stays silent and the failure is four empty
        // cards for as long as the reader stays. If it has said anything by
        // now, it is working and scrolling is what should start the film; only
        // total silence means falling back.
        timer = setTimeout(() => {
            if (!heardFromObserver) reveal();
        }, 2500);

        return () => {
            observer.disconnect();
            if (timer) clearTimeout(timer);
        };
    }, []);

    return { ref, near };
}

/**
 * A section: what it is on the left, the thing itself on the right.
 *
 * The card column is a fixed 716px rather than a fraction, because that is the
 * width the carousel's cards were drawn for. Their art boxes are fixed heights,
 * so any narrower and the artwork stops filling them and the card reads as
 * letterboxed — which is the same thing that went wrong when these ran to the
 * page's full width.
 *
 * That fixed column is also why the split waits until `xl`. Two columns at `lg`
 * would leave about 200px beside the card, which is a caption, not a paragraph.
 * Below that the two stack with the words first, the card at its own width and
 * centred.
 */
function ShowcaseSection({ id, children }: { id: string; children: ReactNode }) {
    const copy = GOLDEN.showcase[id as keyof typeof GOLDEN.showcase];

    return (
        <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_716px] xl:gap-14">
            <div className="xl:pr-4">
                <h3 className="text-[26px] leading-[1.15] tracking-tight text-[#363636] md:text-[32px]">
                    {copy.title}
                </h3>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-stone-600 md:mt-4 md:text-[16px]">
                    {copy.body}
                </p>
            </div>
            <div className="mx-auto w-full max-w-[716px] xl:mx-0">{children}</div>
        </div>
    );
}

function ShowcaseCard({ id }: { id: string }) {
    const { t } = useLanguage();
    const { ref, near } = useNearViewport<HTMLDivElement>();
    const Art = SLIDE_ART[id];
    const title = t(`onboarding.intro.slides.${id}.title`);

    return (
        <div ref={ref} data-showcase-card={id}>
            <ShowcaseSection id={id}>
                <SlideCard id={id} title={title} headerAlways>
                    {/* The card keeps its art box either way, so the page does
                        not jump as each demo arrives. Only what goes inside it
                        waits. */}
                    {near && Art ? <Art /> : <div className={`h-full ${slideArtInnerClass(id)}`} />}
                </SlideCard>
            </ShowcaseSection>
        </div>
    );
}

/**
 * The golden mind.
 *
 * Not a SlideCard: this is the one card with no slide behind it, and its box is
 * taller than any slide's because it holds a film, a caption that changes with
 * it, and the finding underneath. It keeps the card's shape, ground and header
 * so it reads as the fourth of four rather than as something bolted on.
 *
 * `play` is tied to the viewport gate, so the brain fills as the card is
 * reached rather than having already finished somewhere above the fold.
 */
function GoldenMindCard() {
    const { ref, near } = useNearViewport<HTMLDivElement>();

    return (
        <div ref={ref} data-showcase-card="golden-mind">
            <ShowcaseSection id="science">
                <div
                    className="relative -mx-3 overflow-hidden rounded-[28px] border border-stone-200/70 px-4 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] md:mx-0 md:px-8 md:py-8"
                    style={{ backgroundColor: CARD_BG }}
                >
                    {/* No mark and no headline on this card: the section's own
                        title is beside it now, and the film names each step as
                        it goes. A third title in the middle would be one too
                        many. */}
                    <div className="relative z-10">
                        <div className="h-[430px] sm:h-[500px] md:h-[540px] w-full">
                            <GoldenMindLoop play={near} />
                        </div>
                    </div>
                </div>
            </ShowcaseSection>
        </div>
    );
}

export default function ProgramShowcase() {
    // Its own gutter rather than the page's `md:px-[10%]`: at 1280 that padding
    // leaves 1024px, and a 716px card plus a gap takes all but 250px of it. A
    // plain 24px gutter with a capped container gives the paragraph room
    // without the card giving any width back.
    return (
        <section className="px-6 pb-16 pt-10 md:pb-24 md:pt-16">
            {/* Wide enough to hold a 716px card and a readable column beside it.
                The cards carry a negative side margin of their own, so the
                artwork can still reach past the gutter on a phone the way it
                does in the carousel. */}
            <div className="mx-auto flex max-w-[1240px] flex-col gap-16 md:gap-24">
                {SHOWCASE.map((id) => (
                    <ShowcaseCard key={id} id={id} />
                ))}
                <GoldenMindCard />
            </div>
        </section>
    );
}
