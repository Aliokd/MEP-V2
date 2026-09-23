"use client";

import { useReducedMotion } from 'framer-motion';
import { GOLDEN } from '../content';
import { GOLD_GRADIENT, GOLD_PRESS } from '../goldPalette';
import { ACTIVATE_ANCHOR, ACTIVATE_EVENT, LEARN_MORE_ANCHOR } from '../activateEvent';

/**
 * The two ways off a ticket page's first screen, side by side and the same
 * size: read on, or go straight to the ticket.
 *
 * Activate is printed on the ticket's own gradient (goldPalette: bright to
 * mid to deep) and does what the activation card's button does, from the top
 * of the page: it takes the visitor down to the card and tells the card to
 * open once it is in view. Learn more is the quiet one, translucent white per
 * the brand's secondary style, and only scrolls to the first section.
 *
 * Both scroll smoothly unless the visitor asked for less motion.
 */
export default function GoldenHeroActions() {
    const reduce = useReducedMotion();
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';

    const learnMore = () => {
        document.getElementById(LEARN_MORE_ANCHOR)?.scrollIntoView({ behavior, block: 'start' });
    };

    const activate = () => {
        document.getElementById(ACTIVATE_ANCHOR)?.scrollIntoView({ behavior, block: 'start' });
        window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    };

    // One size for both, so the pair reads as a choice rather than a button
    // and an afterthought.
    const size = 'rounded-full px-7 py-4 text-lg font-semibold md:px-10 md:py-5 md:text-xl select-none';

    return (
        <div className="flex flex-wrap items-start justify-center gap-3 md:gap-4">
            <button
                type="button"
                onClick={learnMore}
                // mb matches the gold button's pressed-in offset, so the two
                // faces line up rather than their shadows.
                className={`${size} mb-[7px] border border-stone-300/80 bg-white/60 text-stone-900 backdrop-blur-sm transition-colors hover:bg-white/85`}
            >
                {GOLDEN.hero.learnMore}
            </button>
            <button
                type="button"
                onClick={activate}
                style={{ backgroundImage: GOLD_GRADIENT, ['--press' as string]: GOLD_PRESS }}
                className={`${size} golden-press border border-transparent text-stone-900`}
            >
                {GOLDEN.activate.button}
            </button>
        </div>
    );
}
