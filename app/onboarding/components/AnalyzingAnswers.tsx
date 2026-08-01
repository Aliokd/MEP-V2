"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// The screen between the last question and the verdict. It reads back what the
// visitor actually answered, one line at a time — their own words, not a
// spinner over a generic "analyzing" label. That is the whole job of this step:
// by the time the verdict lands it has to be obvious that it was built from
// these five answers rather than written in advance.
//
// Deliberately unhurried. A progress bar that fills in half a second says the
// answers were skimmed; this one takes about as long as reading them would.
const ROW_MS = 620;
// A held beat after the last line, while the set is "weighed" as a whole.
const WEIGH_MS = 1200;

// How long each testimonial holds, and how many are shown before the screen
// moves on. Reading the five answers back takes ~3.1s, which is not enough time
// to read even two quotes — so the screen's total duration is derived from
// these below rather than the other way round. It is the one place in the flow
// where a wait is worth lengthening: there is nothing to do but wait, and a
// reason to keep going is better use of the time than a shorter bar.
const TESTIMONIAL_MS = 2600;
const TESTIMONIALS_SHOWN = 3;

/**
 * PLACEHOLDER COPY. The quotes under `onboarding.analyzing.testimonials` were
 * written to build this screen, not collected from anyone — the names attached
 * to them are invented. They must be replaced with real, attributable quotes
 * before this reaches a customer: a made-up review shown as a genuine one is a
 * misrepresentation, whatever the intent behind it.
 *
 * The shape is `{ quote, name }` per entry, and the list can be any length —
 * TESTIMONIALS_SHOWN caps how many appear and the screen's duration follows.
 */
type Testimonial = { quote: string; name: string };

export default function AnalyzingAnswers({ answers, onComplete }: {
    /** The visitor's own answers, already resolved to their display labels. */
    answers: string[];
    onComplete: () => void;
}) {
    const { t, tList } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    const [read, setRead] = useState(0);
    const [quoteIndex, setQuoteIndex] = useState(0);

    const testimonials = tList<Testimonial>('onboarding.analyzing.testimonials');

    // The page passes an inline arrow here, so a bare dependency on it would
    // restart every timer on each render and the screen would never advance.
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;

    // Long enough to read the answers back AND to show the quotes, whichever
    // needs more — so adding a sixth answer or a fourth quote can't leave one
    // of them cut off mid-way.
    const runFor = Math.max(
        ROW_MS * answers.length + WEIGH_MS,
        TESTIMONIAL_MS * Math.min(TESTIMONIALS_SHOWN, testimonials.length || 1),
    );

    useEffect(() => {
        if (prefersReducedMotion) {
            setRead(answers.length);
            const id = setTimeout(() => completeRef.current(), 900);
            return () => clearTimeout(id);
        }

        const timers = answers.map((_, i) =>
            setTimeout(() => setRead(i + 1), ROW_MS * (i + 1)),
        );
        timers.push(setTimeout(() => completeRef.current(), runFor));

        return () => timers.forEach(clearTimeout);
    }, [answers.length, prefersReducedMotion, runFor]);

    // One quote at a time, swapped on its own clock. Stops at the last one
    // rather than wrapping — the screen ends before it could come round again,
    // and a quote repeating would say there were only ever two.
    useEffect(() => {
        if (prefersReducedMotion || testimonials.length < 2) return;
        const last = Math.min(TESTIMONIALS_SHOWN, testimonials.length) - 1;
        const timers = Array.from({ length: last }, (_, i) =>
            setTimeout(() => setQuoteIndex(i + 1), TESTIMONIAL_MS * (i + 1)),
        );
        return () => timers.forEach(clearTimeout);
    }, [prefersReducedMotion, testimonials.length]);

    const quote = testimonials[quoteIndex];

    return (
        <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
        >
            <div className="space-y-3 text-center">
                <h2 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-[#363636] md:text-[3.25rem]">
                    {t('onboarding.analyzing.title')}
                </h2>
                <p className="text-[15px] font-medium text-stone-700/80">
                    {t('onboarding.analyzing.subtitle')}
                </p>
            </div>

            <div className="space-y-5 rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-9">
                <ul className="space-y-3.5">
                    {answers.map((answer, i) => {
                        const done = i < read;
                        const active = i === read;

                        return (
                            <motion.li
                                key={i}
                                initial={false}
                                animate={{
                                    opacity: done ? 1 : active ? 0.85 : 0.25,
                                    y: done || active ? 0 : 4,
                                }}
                                transition={
                                    prefersReducedMotion
                                        ? { duration: 0 }
                                        : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                                }
                                className="flex items-center gap-3.5"
                            >
                                {/* One fixed slot for both marks, so the text
                                    never shifts as a row is ticked off. */}
                                <span className="grid h-6 w-6 shrink-0 place-items-center">
                                    {done ? (
                                        <motion.span
                                            initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                                            className="grid h-6 w-6 place-items-center rounded-full bg-[#86BE7F]/20"
                                        >
                                            <Check size={14} className="stroke-[3px] text-[#3f6b3a]" />
                                        </motion.span>
                                    ) : active ? (
                                        <Loader2 size={16} className="animate-spin text-stone-400" />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400/50" />
                                    )}
                                </span>

                                <span
                                    className={`text-[15px] font-medium leading-snug transition-colors duration-500 md:text-[16px] ${
                                        done ? 'text-[#363636]' : 'text-stone-600'
                                    }`}
                                >
                                    {answer}
                                </span>
                            </motion.li>
                        );
                    })}
                </ul>

                <div className="h-2 overflow-hidden rounded-full bg-[#BBBEB2]/25">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(read / Math.max(answers.length, 1)) * 100}%` }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-stone-900"
                    />
                </div>
            </div>

            {/* Testimonials, one at a time, under the scan. This is the only
                screen in the flow with nothing to do on it, which makes it the
                right place for other people's words — and the wrong place for
                anything that needs a decision.

                The row holds its height whichever quote is in it, so the card
                above never shifts as they swap.

                The swap itself is out-instantly, in-with-a-fade — no exit
                animation and so no AnimatePresence. Two quotes crossfading
                through each other would be unreadable while they overlap, and
                `mode="wait"`, which avoids that by holding the outgoing one
                until its exit finishes, is the same construct that stalled the
                carousel and the step machine: if the exit never completes, the
                next quote never mounts and the rotation silently stops on the
                first one. Mounting the new quote directly cannot get stuck.

                They hold this space for the whole screen. The closing line used
                to live here and take it over the moment the last answer was
                ticked — which is 3.1s into a 7.8s screen, so the quotes would
                have disappeared for the longer half of the wait. The tick marks
                and the filled bar already say the reading is done; a sentence
                repeating it is not worth the only slot the quotes have. */}
            <div className="flex min-h-[104px] items-center justify-center px-4">
                {quote && (
                    <motion.figure
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
                        }
                        className="mx-auto max-w-lg space-y-2 text-center"
                    >
                        <blockquote className="text-[17px] font-medium leading-snug text-stone-900 md:text-[19px]">
                            {quote.quote}
                        </blockquote>
                        <figcaption className="text-[13px] font-medium text-stone-500">
                            {quote.name}
                        </figcaption>
                    </motion.figure>
                )}
            </div>
        </motion.div>
    );
}
