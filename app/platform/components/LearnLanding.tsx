"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * When Deep dive opens — 40 days from 2026-08-15, when it was set.
 *
 * A fixed date on purpose: the previous countdown was `Date.now() + n days`
 * evaluated at mount, so it restarted on every page load and never actually
 * counted down. Move this date to change the deadline.
 */
const DEEP_DIVE_LAUNCH_MS = Date.parse('2026-09-24T00:00:00Z');

function formatCountdown(remainingMs: number) {
    const clamped = Math.max(0, remainingMs);
    const totalSeconds = Math.floor(clamped / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/* The three cards are now identical shells — same shape, same artwork
   treatment, same padding — so the styling lives in one place rather than being
   restated three times and drifting apart. */
const CARD =
    'learn-card group relative text-left w-full h-full min-h-[172px] md:min-h-[210px] xl:min-h-[260px] rounded-[24px] overflow-hidden border border-stone-300/60 transition-all cursor-pointer active:scale-[0.995] shadow-[0_4px_20px_rgba(0,0,0,0.015)]';
/* 80% — a fifth back from full. Enough to settle the artwork behind the type
   without the washed-out look the old 70% gave it. */
const CARD_IMG = 'absolute inset-0 w-full h-full object-cover opacity-80';

/**
 * 1x and 2x candidates, picked by the browser on device pixel ratio.
 *
 * The source art is only ~737px wide, so on a high-DPI screen the browser was
 * stretching it — worst in the stacked layout, where a 649px-wide card needs
 * ~1300 device pixels. Stretching an already grain-smoothed encode is what made
 * the artwork look blocky. The 2x files are Lanczos-upscaled from the original
 * PNG and encoded low (q32): at double density the compression is invisible,
 * and it was resolution, not the quality setting, that was missing.
 *
 * Density descriptors rather than `w` + `sizes` on purpose. The cards are as
 * wide as the panel, which is the window minus a sidebar that itself appears
 * and disappears by breakpoint — so a `sizes` expression is a guess about a
 * width the layout has not committed to yet, and guessing low silently
 * reinstates the very stretching this is meant to remove. Pixel ratio is the
 * thing actually being compensated for, and the browser knows it exactly.
 */
const srcSet = (base: string) =>
    `/assets/Learn/${base}.avif 1x, /assets/Learn/${base}@2x.avif 2x`;
const CARD_BODY = 'relative h-full flex flex-col justify-between p-6 lg:p-8';
/* Size comes from .learn-card-title in globals.css — it tracks the card's own
   width, which no viewport breakpoint can stand in for here. */
const CARD_TITLE = 'learn-card-title font-sans font-medium text-stone-900 leading-[1.1]';
/* The arrow and the countdown scale with the title rather than staying at their
   two-up-layout size, which read as small once the cards grew. */
const CARD_ARROW = 'self-end text-stone-900 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5';
const CARD_ARROW_SIZE = 40;

interface LearnLandingProps {
    onStart: () => void;
    onOpenIdeas: () => void;
}

/**
 * Learn landing — light grainy artwork with dark type, per the Figma frames:
 * Master fundamentals and Deep dive side by side, Bank of tips as a wide
 * banner beneath them.
 */
export default function LearnLanding({ onStart, onOpenIdeas }: LearnLandingProps) {
    const { t } = useLanguage();
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        /* Three equal portrait cards in one row: Master fundamentals, Bank of
           tips, Deep dive.

           The row starts at xl, not md. The cards divide the panel, which is the
           window minus the sidebar — so at md the three columns were ~180px each
           and the last one ran off the edge. Below xl they stack as full-width
           blocks and the column scrolls. */
        <div className="w-full flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 max-xl:auto-rows-min max-xl:content-start gap-4 px-4 md:px-0 overflow-y-auto xl:overflow-visible">
            <button
                onClick={onStart}
                data-tour="learn-fundamentals"
                className={CARD}
            >
                {/* AVIF first, WebP as the fallback for browsers without it.
                    next/image cannot help here — images.unoptimized is on — so
                    the files themselves are the optimisation. These are grainy
                    full-bleed artworks and the grain is nearly all the bytes;
                    AVIF is far better at it than WebP, and at 70% opacity behind
                    text the texture it does smooth away is not visible. */}
                <picture>
                    <source srcSet={srcSet('fundamentals-2')} type="image/avif" />
                    <img
                        src="/assets/Learn/fundamentals-2.webp"
                        alt=""
                        width={737}
                        height={1313}
                        fetchPriority="high"
                        decoding="async"
                        className={`${CARD_IMG} transition-transform duration-700 group-hover:scale-[1.04]`}
                    />
                </picture>
                <div className={CARD_BODY}>
                    <h2 className={CARD_TITLE}>
                        {t('learn.master_fundamentals')}
                    </h2>
                    <ArrowRight
                        size={CARD_ARROW_SIZE}
                        strokeWidth={2}
                        className={CARD_ARROW}
                    />
                </div>
            </button>

            <button
                onClick={onOpenIdeas}
                data-tour="learn-ideas"
                className={CARD}
            >
                <picture>
                    <source srcSet={srcSet('bank-of-tips-2')} type="image/avif" />
                    <img
                        src="/assets/Learn/bank-of-tips-2.webp"
                        alt=""
                        width={741}
                        height={1366}
                        fetchPriority="high"
                        decoding="async"
                        className={`${CARD_IMG} transition-transform duration-700 group-hover:scale-[1.04]`}
                    />
                </picture>
                <div className={CARD_BODY}>
                    <h2 className={CARD_TITLE}>
                        {t('learn.bank_of_ideas')}
                    </h2>
                    <ArrowRight
                        size={CARD_ARROW_SIZE}
                        strokeWidth={2}
                        className={CARD_ARROW}
                    />
                </div>
            </button>

            {/* Deep dive is not open yet, so this is a plain panel rather than a
                button: it shows the countdown but does not navigate anywhere. */}
            <div
                aria-disabled="true"
                className={`${CARD} select-none`}
            >
                <picture>
                    <source srcSet={srcSet('deep-dive')} type="image/avif" />
                    <img
                        src="/assets/Learn/deep-dive.webp"
                        alt=""
                        width={736}
                        height={1313}
                        decoding="async"
                        className={CARD_IMG}
                    />
                </picture>
                <div className={CARD_BODY}>
                    <div className="flex flex-col gap-1">
                        <h2 className={CARD_TITLE}>
                            {t('learn.deep_dive')}
                        </h2>
                        {/* Plain text in both states — no hover pill. The card is
                            already inert, and the countdown below says the same
                            thing without a container appearing under the pointer. */}
                        <span className="self-start text-lg font-sans text-stone-600">
                            {t('learn.coming_soon')}
                        </span>
                    </div>
                    {/* Light pill so the digits stay readable over the dark forest
                        at the bottom of the artwork. */}
                    <span className="self-end bg-white/80 backdrop-blur-sm text-stone-900 text-lg lg:text-xl font-mono font-semibold tracking-wide px-5 py-2.5 rounded-full">
                        {formatCountdown(DEEP_DIVE_LAUNCH_MS - now)}
                    </span>
                </div>
            </div>
        </div>
    );
}
