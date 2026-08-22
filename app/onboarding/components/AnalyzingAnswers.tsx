"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRIMARY_BUTTON } from './buttonStyles';

// The screen between the last question and the verdict. It reads back what the
// visitor actually answered, one line at a time — their own words, not a
// spinner over a generic "analyzing" label. That is the whole job of this step:
// by the time the verdict lands it has to be obvious that it was built from
// these five answers rather than written in advance.
//
// Deliberately unhurried, and slower than reading alone would need. A progress
// bar that fills in half a second says the answers were skimmed; this one is
// paced so the screen is worth watching — each line lands, is read, and is
// ticked before the next one starts.
const ROW_MS = 900;
// A held beat after the last line, while the set is "weighed" as a whole. Long
// enough to read as consideration rather than as a frame dropped between the
// last tick and the headline changing.
const WEIGH_MS = 1900;
/**
 * The ceiling on the ticking, whatever the answers add up to.
 *
 * The list is as long as the visitor made it: one struggle or five, one goal or
 * nine. At a flat 900ms a maximal quiz would tick for thirteen seconds, and the
 * generosity this screen is going for turns into a wait somewhere around eight.
 * So the row time is whatever fits in this budget, never longer than ROW_MS and
 * never so short that the rows stop being readable — a short set is unhurried,
 * a long one just moves.
 */
const PASS_CAP_MS = 8000;
const MIN_ROW_MS = 420;

/**
 * How long each testimonial holds, and how many are shown. The quotes keep
 * rotating after the pass has finished, for as long as the visitor leaves the
 * screen up: they are what the wait is for, and a reason to keep going is
 * better use of the time than a shorter bar.
 *
 * The hold is not the reading time. The swap underneath spends 1.1s moving and
 * holds the incoming quote back another 0.2s, so what is left standing still is
 * this figure less about 1.3s. At 4400 that was three seconds for two lines and
 * a name, which is enough to finish reading only if you started immediately;
 * seven leaves the quote at rest for nearly six, which is long enough to notice
 * it, read it, and look away before it moves.
 */
const TESTIMONIAL_MS = 7000;
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

/**
 * The burst behind the headline when the plan lands. Fourteen pieces, three
 * colours, all of them small: this is the one moment in the flow worth marking,
 * and a screenful of paper would be marking it louder than it deserves.
 *
 * Fixed rather than random — a burst that is different every time is a burst
 * nobody tuned, and these are placed to clear the middle of the line, where the
 * words are, and gather at its ends.
 *
 * `x` is where the piece starts across the headline, the rest is where it goes:
 * `dx`/`dy` in px from there, `r` degrees of turn on the way, `d` ms of delay so
 * they do not all leave on the same frame.
 */
const CONFETTI = [
    { x: 8, dx: -34, dy: -46, r: -140, d: 0, w: 6, h: 6, c: '#86BE7F', round: true },
    { x: 15, dx: -18, dy: 44, r: 120, d: 90, w: 4, h: 9, c: '#363636', round: false },
    { x: 22, dx: -30, dy: -28, r: 80, d: 40, w: 5, h: 5, c: '#5F9857', round: false },
    { x: 30, dx: -8, dy: -54, r: -60, d: 140, w: 5, h: 5, c: '#86BE7F', round: true },
    { x: 38, dx: -14, dy: 40, r: 100, d: 30, w: 4, h: 8, c: '#BBBEB2', round: false },
    { x: 46, dx: 6, dy: -50, r: 150, d: 110, w: 5, h: 5, c: '#363636', round: true },
    { x: 54, dx: -4, dy: 46, r: -110, d: 70, w: 5, h: 5, c: '#86BE7F', round: false },
    { x: 62, dx: 16, dy: -44, r: 90, d: 20, w: 4, h: 9, c: '#5F9857', round: false },
    { x: 70, dx: 12, dy: 42, r: -80, d: 130, w: 5, h: 5, c: '#BBBEB2', round: true },
    { x: 78, dx: 30, dy: -30, r: 130, d: 60, w: 5, h: 5, c: '#86BE7F', round: false },
    { x: 85, dx: 22, dy: 46, r: -100, d: 100, w: 4, h: 8, c: '#363636', round: false },
    { x: 92, dx: 36, dy: -48, r: 70, d: 10, w: 6, h: 6, c: '#5F9857', round: true },
    { x: 4, dx: -40, dy: 30, r: 110, d: 150, w: 5, h: 5, c: '#BBBEB2', round: false },
    { x: 96, dx: 42, dy: 26, r: -120, d: 80, w: 5, h: 5, c: '#86BE7F', round: true },
] as const;

const Confetti = () => (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
        {CONFETTI.map((p, i) => (
            <span
                key={i}
                className={`confetti-piece absolute top-1/2 block ${p.round ? 'rounded-full' : 'rounded-[1px]'}`}
                style={{
                    left: `${p.x}%`,
                    width: p.w,
                    height: p.h,
                    background: p.c,
                    animationDelay: `${p.d}ms`,
                    ['--cx' as string]: `${p.dx}px`,
                    ['--cy' as string]: `${p.dy}px`,
                    ['--cr' as string]: `${p.r}deg`,
                } as React.CSSProperties}
            />
        ))}
    </span>
);

/**
 * The little flag beside a testimonial name. Drawn inline rather than set as a
 * flag emoji because Windows renders flag emoji as bare letter pairs ("ES") —
 * and Windows is most of this product's desktop audience. Simplified drawings:
 * bands and crosses only, no heraldry, which at 20px wide is all a flag is.
 */
const FLAGS: Record<string, React.ReactNode> = {
    es: (
        <>
            <rect width="20" height="14" fill="#C60B1E" />
            <rect y="3.5" width="20" height="7" fill="#FFC400" />
        </>
    ),
    mx: (
        <>
            <rect width="20" height="14" fill="#FFFFFF" />
            <rect width="6.67" height="14" fill="#006847" />
            <rect x="13.33" width="6.67" height="14" fill="#CE1126" />
        </>
    ),
    no: (
        <>
            <rect width="20" height="14" fill="#BA0C2F" />
            <rect x="5" width="4" height="14" fill="#FFFFFF" />
            <rect y="5" width="20" height="4" fill="#FFFFFF" />
            <rect x="6" width="2" height="14" fill="#00205B" />
            <rect y="6" width="20" height="2" fill="#00205B" />
        </>
    ),
};

const Flag = ({ country }: { country?: string }) => {
    const shapes = country ? FLAGS[country] : null;
    if (!shapes) return null;
    return (
        <svg
            viewBox="0 0 20 14"
            aria-hidden="true"
            className="inline-block h-[11px] w-auto rounded-[2px] align-baseline ring-1 ring-stone-900/10"
        >
            {shapes}
        </svg>
    );
};

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
type Testimonial = { quote: string; name: string; country?: string; image?: string };

export default function AnalyzingAnswers({ answers, onComplete, onBack, frozen = false, waitlist = false }: {
    /** The visitor's own answers, already resolved to their display labels. */
    answers: string[];
    /** Pressed, not waited out — see `ready` below. */
    onComplete: () => void;
    /**
     * The campaign flow. Changes one word: the button that opens the email
     * dialog says what that dialog does there — join the waitlist — rather
     * than "Reveal my plan", which is the step after it.
     */
    waitlist?: boolean;
    /**
     * Back to the quiz, with every answer still where the visitor left it. The
     * control is hidden without it rather than being drawn inert — there is no
     * honest disabled state for "you cannot change your mind".
     */
    onBack?: () => void;
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
        // `passed` guards the way back: closing the email dialog returns to this
        // screen with `frozen` off, and without this the whole pass would start
        // again — the counter walking back down from full behind a headline
        // that had already said the plan was ready.
        if (finished || passed) return;

        const rowMs = Math.max(
            MIN_ROW_MS,
            Math.min(ROW_MS, PASS_CAP_MS / Math.max(answers.length, 1)),
        );

        const timers = answers.map((_, i) =>
            setTimeout(() => setTicked(i + 1), rowMs * (i + 1)),
        );
        // A held beat after the last row before the button lands, so the
        // gesture is "weighed, then answered" rather than a control appearing
        // on top of the tick that was still animating in.
        timers.push(setTimeout(() => setPassed(true), rowMs * answers.length + WEIGH_MS));

        return () => timers.forEach(clearTimeout);
    }, [answers.length, finished, passed]);

    // One quote at a time, round and round the three. It used to stop on the
    // last one, which was right when the screen moved itself on and wrong now
    // that it waits to be pressed: a visitor who takes a minute over the
    // button would spend most of it looking at one quote that had stopped
    // being new. Coming round again is the lesser of the two — the set is
    // three, and a fourth showing is a rotation, not a claim that there are
    // only three people to quote.
    // The set that is actually in the pane, and the one the rotation counts
    // against. Everything below indexes into this rather than the whole list.
    const shownQuotes = testimonials.slice(0, TESTIMONIALS_SHOWN);

    useEffect(() => {
        if (frozen || prefersReducedMotion || shownQuotes.length < 2) return;
        const id = setInterval(
            () => setQuoteIndex((i) => (i + 1) % shownQuotes.length),
            TESTIMONIAL_MS,
        );
        return () => clearInterval(id);
    }, [prefersReducedMotion, shownQuotes.length, frozen]);

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
            {/* One line, and it changes when the pass does: what is happening
                while it happens, then what came of it. The small line that used
                to sit above it said the same thing as the headline does now —
                two labels for one state, one of them announcing the pass was
                finished while the bar under it was still filling. */}
            {/* The confetti mounts with the finished headline and never
                remounts, so the burst plays once, on the line it belongs to.
                It sits behind the words rather than over them: this is the
                sentence the whole screen has been working towards, and paper
                falling across it would be celebrating on top of the news. */}
            <div className="relative text-center">
                {ready && <Confetti />}
                <h2 className="relative text-4xl font-sans font-light leading-[1.1] tracking-tight text-[#363636] md:text-[3.25rem]">
                    {t(ready ? 'onboarding.analyzing.title_done' : 'onboarding.analyzing.title')}
                </h2>
            </div>

            {/* The scan panel, and only while there is scanning to show. Once
                the pass is done it has nothing left to say — every row ticked,
                the bar full — and holding it under a headline that says the
                plan is ready makes the visitor read a finished progress bar
                before they can reach the button. Going away is also what brings
                the quote and the button up the screen to meet the eye.

                Glass rather than the flat cream panel: it sits over the painted
                page, and what is inside it is a list being worked through
                rather than a card of content.

                It collapses rather than unmounting, and by CSS rather than by
                an exit animation. `grid-rows-[1fr]` to `[0fr]` is a height the
                browser interpolates on its own; an AnimatePresence exit is a
                JS-driven one, and an exit that never finishes — a tab that
                isn't compositing frames will do it — is an element that never
                leaves. The panel would simply sit there, which is the one
                outcome this must not have. */}
            <div
                className={`grid transition-all duration-[900ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
                    ready ? 'mt-0 grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 rounded-[28px] border border-white/50 bg-white/25 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:p-6">
                {/* The window. Its height is whatever three rows need — or all
                    of them, when there are fewer than three — and it is the one
                    thing on this card that never changes size. */}
                <div
                    className="relative overflow-hidden"
                    style={{ height: windowRows * ROW_H + (windowRows - 1) * ROW_GAP }}
                >
                    {/* No fade over the top edge. There was one, to soften the
                        row being clipped as it left, and on glass it could only
                        be a wash of flat colour over a panel whose whole point
                        is that the page shows through it — so it read as a
                        beige band sitting on the first line rather than as
                        anything fading. A row clipped at the window's edge is
                        clipped; the panel's own rounded top is the edge. */}
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
                                {/* One fixed slot for all three marks, so the
                                    text never shifts as a row is ticked off.
                                    The tick is bare and black — a green disc
                                    behind it was a second colour doing the same
                                    job as the mark itself, and on glass it read
                                    as a chip stuck to the panel. */}
                                <span className="grid h-6 w-6 shrink-0 place-items-center">
                                    {done ? (
                                        <motion.span
                                            initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                                            className="grid place-items-center"
                                        >
                                            <Check size={18} className="stroke-[3px] text-stone-900" />
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
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-900/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(read / Math.max(answers.length, 1)) * 100}%` }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full bg-stone-900"
                        />
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-stone-900/60">
                        {read}/{answers.length}
                    </span>
                </div>
                </div>
              </div>
            </div>

            {/* Testimonials, one at a time, under the scan. This is the only
                screen in the flow with nothing to do on it, which makes it the
                right place for other people's words — and the wrong place for
                anything that needs a decision.

                They get a pane of their own, glass like the scan panel above
                them, and it stays whichever quote is in it. Two things come of
                that: the words have something to sit on rather than floating
                loose over the painting, and the pane holds one fixed height and
                one fixed position, so the panel above can leave without the
                quotes appearing to move on their own.

                All three are mounted at once and stacked, and the swap is a
                class change the browser transitions: the one leaving drifts up
                and fades, the one arriving rises into its place. Nothing mounts
                or unmounts, so there is no frame where the pane is empty —
                which is what the old swap did, and what made it flash.

                The incoming quote is held back 200ms so the two are never both
                legible at once. That is the whole reason the previous approach
                cut rather than crossfaded; a stagger solves it without the cut.

                CSS rather than motion values, for the reason the row slide and
                the panel collapse are: an animation that stalls part-way leaves
                a quote half-faded, and a transition that never runs still ends
                where the class says it does. */}
            <div className="mx-auto flex min-h-[148px] w-full max-w-xl items-center rounded-[28px] border border-white/40 bg-white/30 px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:px-7">
                <div className="relative min-h-[104px] w-full">
                    {shownQuotes.map((entry, i) => {
                        // Where this quote sits relative to the one on screen:
                        // 0 is showing, the last index is the one that just
                        // left — it waits above — and everything else waits
                        // below, ready to rise.
                        const rel = (i - quoteIndex + shownQuotes.length) % shownQuotes.length;
                        const active = rel === 0;
                        const leaving = rel === shownQuotes.length - 1;

                        return (
                            <figure
                                key={i}
                                aria-hidden={!active}
                                style={{ transform: `translateY(${active ? 0 : leaving ? -16 : 16}px)` }}
                                // Face, then words, ranged left. Centred text
                                // under a centred card was a third centred block
                                // on a screen that already has two; set against a
                                // portrait it reads as something a person said
                                // rather than a caption.
                                className={`absolute inset-0 flex items-center gap-4 text-left transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:gap-5 ${
                                    active ? 'opacity-100 delay-200' : 'pointer-events-none opacity-0'
                                }`}
                            >
                                {/* No portrait slot any more — the monogram
                                    circle it held read as a placeholder for a
                                    face nobody had. The words carry the card;
                                    the name signs it, with a small flag for
                                    where its owner writes from. */}
                                <div className="min-w-0 space-y-1.5">
                                    <blockquote className="text-[19px] font-medium leading-snug text-stone-900 md:text-[22px]">
                                        {entry.quote}
                                    </blockquote>
                                    <figcaption className="flex items-center gap-1.5 text-[13px] font-medium text-stone-500 md:text-[14px]">
                                        <span>{entry.name}</span>
                                        <Flag country={entry.country} />
                                    </figcaption>
                                </div>
                            </figure>
                        );
                    })}
                </div>
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
            <div className="flex min-h-[60px] items-center justify-center gap-4">
                {/* Back to the questions, and only once the reading is done.
                    While it runs there is nothing to decide and nothing to
                    revise yet — a control on screen then is one more thing
                    pulling at a screen whose whole job is to be watched. It
                    arrives with the button beside it, as the other half of the
                    same choice: go on, or go back and change an answer.

                    The quiz's own back control, down to the circle — it is the
                    same gesture and it goes to the same place. */}
                {onBack && ready && (
                    <motion.button
                        type="button"
                        onClick={onBack}
                        aria-label={t('onboarding.go_back')}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                        }
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/55 text-stone-700 transition-colors hover:bg-white hover:text-stone-900"
                    >
                        <ArrowLeft size={22} className="stroke-[2.25px]" />
                    </motion.button>
                )}

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
                    {t(waitlist ? 'onboarding.waitlist.email_cta' : 'onboarding.analyzing.cta')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </motion.button>
            </div>
        </motion.div>
    );
}
