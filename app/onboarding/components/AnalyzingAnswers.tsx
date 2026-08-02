"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRIMARY_BUTTON } from './buttonStyles';

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

// How long each testimonial holds, and how many are shown. Reading the five
// answers back takes ~3.1s, which is not enough time to read even two quotes —
// so the quotes keep rotating after the pass has finished, for as long as the
// visitor leaves the screen up. They are what the wait is for: there is nothing
// to do here but wait, and a reason to keep going is better use of the time
// than a shorter bar.
const TESTIMONIAL_MS = 2600;
const TESTIMONIALS_SHOWN = 3;

/**
 * The answer list is a window, not a column. Three rows are shown at a time and
 * the list slides up under them as each one is ticked, so a visitor who claimed
 * five struggles and wrote three goals of their own gets the same short card as
 * one who answered narrowly — and the row being read is always in it.
 *
 * Three rather than four, and tighter rows, for what is under the card rather
 * than what is in it: the quote and the button have to be on screen without
 * scrolling, and the list is the only thing here that can give up the height.
 *
 * The geometry is fixed rather than measured: every row is one line, clipped if
 * a written-in goal runs long, so the slide is `-index * (row + gap)` and the
 * card's height never depends on what was typed into it.
 */
const VISIBLE_ROWS = 3;
const ROW_H = 40;
const ROW_GAP = 12;

/** "Mara L." → "ML". The stand-in for a face until there is a photograph. */
const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

/**
 * PLACEHOLDER COPY. The quotes under `onboarding.analyzing.testimonials` were
 * written to build this screen, not collected from anyone — the names attached
 * to them are invented. They must be replaced with real, attributable quotes
 * before this reaches a customer: a made-up review shown as a genuine one is a
 * misrepresentation, whatever the intent behind it.
 *
 * The shape is `{ quote, name, image? }` per entry, and the list can be any
 * length — TESTIMONIALS_SHOWN caps how many appear.
 *
 * `image` is a path under /public and is what the portrait beside the quote
 * draws; entries without one fall back to a monogram. It is left unset on all
 * three for the same reason the quotes are marked placeholder above: a stock
 * face or a crop of an unrelated clip put next to an invented quote is a
 * photograph of someone who never said it. Fill it in with the real person's
 * portrait at the same time as their real words.
 */
type Testimonial = { quote: string; name: string; image?: string };

export default function AnalyzingAnswers({ answers, onComplete, frozen = false }: {
    /** The visitor's own answers, already resolved to their display labels. */
    answers: string[];
    /** Pressed, not waited out — see `ready` below. */
    onComplete: () => void;
    /**
     * Holds the screen at its finished state and stops every timer. Used while
     * the email dialog sits over it: the pass has already run, and letting it
     * keep ticking behind the dialog would rotate quotes nobody can read.
     */
    frozen?: boolean;
}) {
    const { t, tList } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    const [ticked, setTicked] = useState(0);
    const [quoteIndex, setQuoteIndex] = useState(0);
    /**
     * Whether the timed pass has run out.
     *
     * The screen used to move itself on when its longest timer ran out, which
     * meant the one screen with nothing to do on it was also the one screen you
     * could not leave early — and it took the visitor to a dialog they never
     * asked for. It now ends on a press: the reading runs, the button arrives
     * with the last tick, and the verdict is revealed when it is asked for.
     */
    const [passed, setPassed] = useState(false);

    const testimonials = tList<Testimonial>('onboarding.analyzing.testimonials');

    // Two states arrive already finished: reduced motion, which is asking for
    // no pass at all, and frozen, which is the dialog sitting over a pass that
    // has already run. Both are read off the props rather than written into
    // state from an effect — what the screen shows in them is a function of
    // what it was handed, and pushing that through a render to set it is a
    // cascade for a value that was never in doubt.
    const finished = frozen || Boolean(prefersReducedMotion);
    const read = finished ? answers.length : ticked;
    const ready = finished || passed;

    useEffect(() => {
        if (finished) return;

        const timers = answers.map((_, i) =>
            setTimeout(() => setTicked(i + 1), ROW_MS * (i + 1)),
        );
        // A held beat after the last row before the button lands, so the
        // gesture is "weighed, then answered" rather than a control appearing
        // on top of the tick that was still animating in.
        timers.push(setTimeout(() => setPassed(true), ROW_MS * answers.length + WEIGH_MS));

        return () => timers.forEach(clearTimeout);
    }, [answers.length, finished]);

    // One quote at a time, swapped on its own clock. Stops on the last one
    // rather than wrapping: the screen now waits to be pressed, so a rotation
    // that came round again would run for as long as someone hesitated and say
    // there were only ever three people to quote.
    useEffect(() => {
        if (frozen || prefersReducedMotion || testimonials.length < 2) return;
        const last = Math.min(TESTIMONIALS_SHOWN, testimonials.length) - 1;
        const timers = Array.from({ length: last }, (_, i) =>
            setTimeout(() => setQuoteIndex(i + 1), TESTIMONIAL_MS * (i + 1)),
        );
        return () => timers.forEach(clearTimeout);
    }, [prefersReducedMotion, testimonials.length, frozen]);

    const quote = testimonials[quoteIndex];

    // How many rows the window holds, and which one is at its top. The row
    // being read sits at the bottom of the window with the two before it above,
    // so a line is only scrolled away once two more have been ticked off after
    // it — and the last three stay put once the pass is done rather than the
    // list running on past its own end.
    const windowRows = Math.min(answers.length, VISIBLE_ROWS) || 1;
    const firstRow = Math.max(0, Math.min(read - (VISIBLE_ROWS - 1), answers.length - VISIBLE_ROWS));

    return (
        <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Tight under the title on purpose. The card is what the title is
            // announcing — the answers being read — so the two belong to each
            // other, and the air the screen needs goes below them, around the
            // quotes and the button, rather than between a heading and the
            // thing it heads.
            className="space-y-6"
        >
            {/* The small line first, the big one second. What the screen has
                been doing is the footnote — "we've read them" — and what the
                visitor gets out of it is the headline: the answers are kept,
                whatever they do next. */}
            <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-stone-500">
                    {t('onboarding.analyzing.eyebrow')}
                </p>
                <h2 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-[#363636] md:text-[3.25rem]">
                    {t('onboarding.analyzing.title')}
                </h2>
            </div>

            <div className="space-y-4 rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-6">
                {/* The window. Its height is whatever three rows need — or all
                    of them, when there are fewer than three — and it is the one
                    thing on this card that never changes size. */}
                <div
                    className="relative overflow-hidden"
                    style={{ height: windowRows * ROW_H + (windowRows - 1) * ROW_GAP }}
                >
                    {/* Rows that have scrolled past the top edge are clipped
                        mid-line rather than at a boundary, which reads as a
                        list still moving. This fades that edge out instead, so
                        what is leaving looks like it is leaving. Only while
                        there is something above to leave — a full-strength
                        gradient over the first row of a five-row list would
                        just look like a dirty card. */}
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-[#EFF0E7] to-transparent transition-opacity duration-500 ${
                            firstRow > 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                    {/* The slide is a CSS transition rather than a motion
                        value: it is one number moving in one direction and
                        nothing has to coordinate with it, and a transform the
                        browser owns keeps moving in cases where a JS-driven one
                        stalls — a tab that isn't compositing frames, mainly,
                        which is where the rest of this screen's animation goes
                        quiet too. `motion-reduce` drops it to a jump. */}
                    <ul
                        className="space-y-3 transition-transform duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                        style={{ transform: `translateY(-${firstRow * (ROW_H + ROW_GAP)}px)` }}
                    >
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
                                style={{ height: ROW_H }}
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

                                {/* One line, clipped. A goal someone wrote
                                    themselves can be a sentence long, and a row
                                    that wrapped would push the ones under it out
                                    of the window it is being scrolled inside. */}
                                <span
                                    className={`min-w-0 truncate text-[15px] font-medium transition-colors duration-500 md:text-[16px] ${
                                        done ? 'text-[#363636]' : 'text-stone-600'
                                    }`}
                                >
                                    {answer}
                                </span>
                            </motion.li>
                        );
                    })}
                    </ul>
                </div>

                {/* The bar carries the count beside it. With only four rows on
                    screen at a time, the list can no longer say how much of it
                    is left — so this has to, and a bar alone says "some of it".
                    Digits rather than a sentence: nothing to translate, and it
                    reads the same in every language the flow is in. */}
                <div className="flex items-center gap-4">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#BBBEB2]/25">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(read / Math.max(answers.length, 1)) * 100}%` }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full bg-stone-900"
                        />
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-stone-500">
                        {read}/{answers.length}
                    </span>
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
            <div className="flex min-h-[132px] items-center justify-center px-2">
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
                        // Face, then words, ranged left. Centred text under a
                        // centred card was a third centred block on a screen
                        // that already has two; set against a portrait it reads
                        // as something a person said rather than a caption.
                        className="mx-auto flex w-full max-w-xl items-center gap-4 text-left md:gap-5"
                    >
                        {/* Empty until there are real portraits to put here —
                            see the note on `image` above. The monogram is not a
                            placeholder for a face so much as what a name looks
                            like without one. */}
                        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EFF0E7] ring-1 ring-stone-300/60 md:h-16 md:w-16">
                            {quote.image ? (
                                <img
                                    src={quote.image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <span aria-hidden="true" className="text-[15px] font-semibold tracking-wide text-stone-500 md:text-[17px]">
                                    {initialsOf(quote.name)}
                                </span>
                            )}
                        </span>

                        <div className="min-w-0 space-y-1.5">
                            <blockquote className="text-[19px] font-medium leading-snug text-stone-900 md:text-[22px]">
                                {quote.quote}
                            </blockquote>
                            <figcaption className="text-[13px] font-medium text-stone-500 md:text-[14px]">
                                {quote.name}
                            </figcaption>
                        </div>
                    </motion.figure>
                )}
            </div>

            {/* The way out. The flat green pill the second half of the flow
                uses — the verdict's and the offer's button — rather than the
                chunky offset one from the carousel and the quiz. This is the
                seam between the two halves, and the button that opens the
                results should already look like the ones on the far side of
                them.

                Its seat is held from the first paint and only its contents fade
                in — the screen is vertically centred in the page, so mounting a
                60px button halfway through would lift everything above it by
                half that, mid-read. Disabled rather than absent while it waits,
                which is also what keeps a keyboard from reaching a control that
                is not there to press yet. */}
            <div className="flex min-h-[60px] items-center justify-center">
                <motion.button
                    type="button"
                    onClick={onComplete}
                    disabled={!ready}
                    initial={false}
                    animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 8 }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                    }
                    className={`${PRIMARY_BUTTON} disabled:pointer-events-none`}
                >
                    {t('onboarding.analyzing.cta')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </motion.button>
            </div>
        </motion.div>
    );
}
