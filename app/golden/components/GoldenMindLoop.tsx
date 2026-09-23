"use client";

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import GoldenMindStage from '@/app/platform/mind-power/components/GoldenMindStage';
import { GOLDEN } from '../content';
import { MARKER_BAND, MARKER_DELAY_MS, MARKER_SWEEP_MS, SCIENCE_SOURCE } from '@/lib/scienceClaim';
import {
    BRAIN_GOLD_SRC,
    FRAME_W,
    FRAME_H,
    REGION_MARKERS,
    REGION_ORDER,
    type RegionKey,
} from '@/app/platform/mind-power/components/brainGeometry';

/**
 * The Mind Power film, for a page nobody is signed in to.
 *
 * It runs on a loop: the brain fills from empty and turns gold, which is the
 * week a golden mind is earned, and then walks the six regions one at a time,
 * each marked on the brain and named, with a line on what songwriting does for
 * it. Then it starts again.
 *
 * Inside the product this is two separate things — the celebration plays when a
 * week is won, and the regions are a view you switch to — and neither makes
 * sense on a page where there is no week and nothing to switch. A loop does:
 * there is no control to find, and whatever moment a reader arrives at, the
 * whole argument comes round.
 *
 * The regions are not tinted here, unlike inside Mind Power. There, six are on
 * screen together and colour is what separates them; here they arrive one at a
 * time against a marked dot, so recolouring the whole brain six times would be
 * movement that carries nothing.
 */

/** How long the fill runs before the regions begin. The stage's own fill is
    2200ms; the rest is the gold crossfade and a beat to see it. */
const GOLD_MS = 4200;
/** One region, named and held. Long enough to read the name without the loop
    feeling like a slideshow nobody can pause. */
const REGION_MS = 2300;

type Phase = { kind: 'gold' } | { kind: 'region'; index: number };

export default function GoldenMindLoop({ play }: { play: boolean }) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    const [phase, setPhase] = useState<Phase>({ kind: 'gold' });
    // Flipping this true again is what replays the stage's fill, so each time
    // the loop comes round the brain empties and fills from the start.
    const [run, setRun] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // The marker under "engages your entire brain." draws once, a beat after
    // the section starts playing, and stays. Under reduced motion it is simply
    // there.
    const [marked, setMarked] = useState(false);
    useEffect(() => {
        if (!play || marked) return;
        const id = setTimeout(() => setMarked(true), MARKER_DELAY_MS);
        return () => clearTimeout(id);
    }, [play, marked]);
    const showMark = marked || Boolean(prefersReducedMotion);

    useEffect(() => {
        if (!play) return;
        // Under reduced motion the film is a still: the brain is gold and stays
        // gold, with no tour and no timers running behind the page.
        if (prefersReducedMotion) {
            setPhase({ kind: 'gold' });
            return;
        }

        const advance = () => {
            setPhase((current) => {
                if (current.kind === 'gold') return { kind: 'region', index: 0 };
                const next = current.index + 1;
                if (next < REGION_ORDER.length) return { kind: 'region', index: next };
                // Round again: a new run number restarts the fill from empty.
                setRun((n) => n + 1);
                return { kind: 'gold' };
            });
        };

        const wait = phase.kind === 'gold' ? GOLD_MS : REGION_MS;
        timer.current = setTimeout(advance, wait);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [play, phase, prefersReducedMotion]);

    const region: RegionKey | null = phase.kind === 'region' ? REGION_ORDER[phase.index] : null;

    const title = region ? t(`progress.regions.${region}.title`) : t('streak_share.title_noname');

    // Only the regions carry a second line, and it says what songwriting does
    // for that area rather than naming the faculty again. The gold step's title
    // says its whole thing already.
    const subtitle = region ? GOLDEN.regionBenefits[region] ?? '' : '';

    return (
        <div className="flex h-full w-full flex-col items-center justify-center" data-golden-loop={region ?? 'gold'}>
            <div className="relative w-full grow">
                {/* The fill, and the gold it ends on. Kept mounted through the
                    region tour rather than swapped out: the stage owns the
                    sparks and the confetti, and remounting it every loop would
                    restart those mid-fall. */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                        region ? 'opacity-0' : 'opacity-100'
                    }`}
                >
                    {/* `light` is the ink tone: this card sits on the brand's
                        beige, not on Mind Power's dark stage, so the level line and number are drawn for paper. */}
                    <GoldenMindStage key={run} play={play} tone="light" className="w-[min(104%,560px)] -my-[8%]" />
                </div>

                {/* The tour. One brain throughout, so nothing moves between steps
                    except which point on it is lit. */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                        region ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden={region ? undefined : true}
                >
                    {/* Gold throughout, including the tour. The green brain is
                        the one still filling; by the time the regions are named
                        the week has been won, and dropping back to green would
                        undo the thing the fill just earned. No hue is laid over
                        it either: inside Mind Power each region has a colour
                        because six are on screen at once and colour is what
                        tells them apart, but here they arrive one at a time
                        against a marked dot. */}
                    <div className="relative w-[min(104%,560px)]">
                        <img src={BRAIN_GOLD_SRC} alt="" className="w-full select-none" />

                        {/* Where each region sits, at the same frame coordinates
                            the product marks them at. Inside Mind Power these
                            are what you tap; here they are only a map, so they
                            take no pointer and no focus. The one being named grows
                            and darkens, which is what ties the caption to a
                            place on the brain rather than leaving it a label
                            under a picture. */}
                        <div className="pointer-events-none absolute inset-0">
                            {REGION_ORDER.map((key) => {
                                const [fx, fy] = REGION_MARKERS[key];
                                const isActive = key === region;
                                return (
                                    <span
                                        key={key}
                                        aria-hidden="true"
                                        className="absolute block -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
                                        style={{
                                            left: `${(fx / FRAME_W) * 100}%`,
                                            top: `${(fy / FRAME_H) * 100}%`,
                                            width: isActive ? 20 : 14,
                                            height: isActive ? 20 : 14,
                                            // White on the gold, the way the
                                            // product marks a region on the
                                            // brain. Size and a halo carry the
                                            // difference between the one being
                                            // named and the other five, since
                                            // they are all the same colour now.
                                            backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                                            // A soft drop shadow rather than a
                                            // ring of the card's colour: these
                                            // sit on the brain, not on the card,
                                            // and the facets under them run from
                                            // pale to deep gold.
                                            boxShadow: isActive
                                                ? '0 0 0 9px rgba(255,255,255,0.3), 0 2px 6px rgba(90,64,12,0.45)'
                                                : '0 1px 4px rgba(90,64,12,0.4)',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* The name of whatever is on screen, in its own colour while a
                region is up. `min-h` holds both lines open so the card does not
                change height as the tour moves between one-line and two-line
                names. The gold step keeps a darker gold than the brain's, which
                is a fill colour and too pale to read as type on cream. */}
            <div className="relative z-10 mt-2 min-h-[4.2em] px-4 text-center">
                <p
                    className="text-[15px] font-medium transition-colors duration-500 sm:text-[17px]"
                    style={{ color: region ? '#363636' : '#A87B1C' }}
                >
                    {title}
                </p>
                <p className="mx-auto mt-1 max-w-[42ch] text-[12.5px] leading-snug text-[#363636]/65 sm:text-[13.5px]">
                    {subtitle}
                </p>
            </div>

            {/* The finding, and who published it. The claim is the science
                slide's own (its locale entry, its source, its marker, shared
                through lib/scienceClaim.ts), so it has one wording and one
                citation across the product. The highlighted half is the link:
                the emphasis and the source are the same words. The marker draws
                across once the section is playing, as it does in onboarding. */}
            <figure className="relative z-10 mt-6 flex flex-col items-center gap-4 px-4 text-center">
                <p className="mx-auto max-w-[30ch] text-[22px] leading-[1.3] tracking-tight text-stone-900 sm:text-[28px]">
                    <span className="block">{t('onboarding.intro.slides.psychology.science.claim_lead')}</span>
                    <a
                        href={SCIENCE_SOURCE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block underline decoration-black/80 decoration-[1.5px] underline-offset-[6px] transition-opacity hover:opacity-70"
                        style={{
                            backgroundImage: MARKER_BAND,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: '0 0',
                            backgroundSize: showMark ? '100% 100%' : '0% 100%',
                            transition: prefersReducedMotion
                                ? 'none'
                                : `background-size ${MARKER_SWEEP_MS}ms cubic-bezier(0.25, 0.8, 0.3, 1)`,
                        }}
                    >
                        {t('onboarding.intro.slides.psychology.science.claim_stress')}
                    </a>
                </p>
                <figcaption>
                    <img
                        src="/onboarding-cards/logo-harvard-medical.svg"
                        alt="Harvard Medical School"
                        className="h-[30px] w-auto select-none opacity-90 sm:h-[34px]"
                    />
                </figcaption>
            </figure>
        </div>
    );
}
