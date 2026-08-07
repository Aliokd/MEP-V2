"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, Undo2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { CUSTOM_PREFIX, customText, isCustom } from './GoalBox';

/**
 * The struggle question, asked one card at a time. Swipe right and the struggle
 * is yours; swipe left and it isn't. Unlike every other question in the quiz
 * this one takes as many answers as the visitor wants to give — a writer who
 * both never finishes and overthinks gets to say so, and the verdict says both
 * back.
 *
 * Running out of cards moves the quiz on by itself. The Next button under the
 * deck is still there, and still means what it means everywhere else: it takes
 * whatever has been kept so far and moves on — for the visitor who has already
 * found their answer three cards in and doesn't want to rule out the other two.
 * That's why keeps are reported as they happen rather than only at the end.
 */

// Past either of these, letting go sends the card away rather than snapping it
// back — distance for a slow deliberate drag, velocity for a quick flick that
// never travels far. Tuned low on purpose: a fifth of the card's width, or a
// lazy flick, is enough. Five of these in a row should feel like dealing
// cards, not like passing five tests.
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 350;

// How long the card takes to leave. The next card is only promoted once it has,
// so this is also the beat between one answer and the next question.
const FLY_MS = 380;

// Cards visible at once: the one being answered and the one behind it. Any
// deeper and the stack starts to read as a pile rather than a queue.
const VISIBLE = 2;

type Direction = 'keep' | 'pass';

export interface Decision {
    value: string;
    direction: Direction;
}

/**
 * Everything the deck knows that its answer alone can't say.
 *
 * The answer is the struggles that were kept. A card that was PASSED leaves no
 * trace in it — and a passed card and a card never dealt look identical from
 * outside — so a deck rebuilt from the answer would deal every rejected card
 * again. Hence this: the whole record, held by the step so it outlives the
 * component, and handed back when the visitor returns.
 */
export interface DeckState {
    decisions: Decision[];
    /**
     * Struggles the visitor wrote at the end of the deck.
     *
     * These are cards, not answers. Writing one deals it: it goes to the top of
     * the deck and has to be swiped like any of the five we wrote, so claiming
     * it is the same gesture as claiming theirs. It used to skip that and go
     * straight into the answer, which quietly made the visitor's own struggle
     * the one card in the question they could not say "not me" to.
     */
    written: string[];
}

// Written on a card of its own, so it gets a card's worth of room and no more.
const OWN_MAX_LENGTH = 44;

/**
 * The two ways to answer, as real buttons rather than the caption they were.
 *
 * Neutral on purpose — the same white-on-a-hairline as `SECONDARY_BUTTON`
 * elsewhere in the flow, not the brand green. These are two equal directions,
 * and the moment one of them carries the colour that means "forward" the pair
 * stops being a choice and starts being a recommendation with an escape hatch
 * beside it. Grey on both sides keeps "not me" as ordinary an answer as
 * "that's me", which is the whole point of the question.
 *
 * They also stay lighter than the primary button under the deck: this screen
 * still has a Next, and two filled pills competing with it would make the card
 * look like it has three ways forward.
 */
const DIRECTION_BUTTON =
    'flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/50 px-5 py-2.5 text-[15px] font-medium text-stone-600 transition-colors hover:border-stone-400 hover:bg-white hover:text-stone-900 md:px-6 md:py-3 md:text-[16px]';

interface SwipeDeckProps {
    questionId: string;
    options: { value: string }[];
    /** The answer so far, current before the deck runs out. */
    onChange: (kept: string[]) => void;
    /** The last card has left. */
    onComplete: (kept: string[]) => void;
    /**
     * Where the deck was left. Read once, on mount — the deck owns its own
     * dealing from there, and the parent only hears about it through
     * `onStateChange`, so there is nothing for the two copies to disagree about.
     */
    state?: DeckState;
    /** Every change to that record, so the step can hold it across a remount. */
    onStateChange?: (state: DeckState) => void;
}

export default function SwipeDeck({
    questionId,
    options,
    onChange,
    onComplete,
    state,
    onStateChange,
}: SwipeDeckProps) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    /**
     * Every card that has been answered, in the order it was answered, with the
     * way it went.
     *
     * This replaces a cursor and a kept-list. Those could say how far through
     * the deck we were and what had been claimed, but not WHERE a given card
     * ended up — and the two piles at the edges of the screen are exactly that
     * question, asked of five cards at once. Everything else is derived from
     * here: the queue is the options this list doesn't mention, the answer is
     * the ones it marks kept, and each pile is one direction's worth.
     */
    const [decisions, setDecisions] = useState<Decision[]>(() => state?.decisions ?? []);
    // The direction the top card is currently leaving in, if it is leaving.
    // Also what locks the deck: no second decision lands mid-flight.
    const [leaving, setLeaving] = useState<Direction | null>(null);
    // Whether the visitor has answered or even started dragging a card yet.
    // Until they have, the top card sways every few seconds — nothing on this
    // screen says "swipe" in words, so the card itself has to move the way it
    // wants to be moved. The first touch retires the hint for the whole deck:
    // someone who has swiped once doesn't need reminding four more times.
    // Someone returning to a deck they have already swiped doesn't need the
    // card miming the gesture at them again.
    const [touched, setTouched] = useState(() => (state?.decisions.length ?? 0) > 0);
    // The decision that just landed, and the line it earned. The text is
    // resolved here rather than at render time because the pass words are
    // picked at random: choosing during render would deal a different word on
    // every re-render, and the line would flicker through the vocabulary while
    // it sat on screen. Keyed by time so rapid swipes each get their own
    // appearance instead of extending the last.
    const [flash, setFlash] = useState<{ direction: Direction; at: number; text: string } | null>(null);

    const [written, setWritten] = useState<string[]>(() => state?.written ?? []);
    const [draft, setDraft] = useState('');

    // Everything that can be dealt: the five we wrote, then anything the visitor
    // added. One pool, so a struggle of their own is a card like the others —
    // same paper, same two directions, same place in the count.
    const pool = useMemo(
        () => [...options.map((o) => o.value), ...written],
        [options, written],
    );
    const decided = useMemo(() => new Set(decisions.map((d) => d.value)), [decisions]);
    // The cards still to answer, in order. A card taken back reappears at its
    // own place rather than at the end, so restoring the second of five puts it
    // in front of the fourth.
    const queue = useMemo(() => pool.filter((value) => !decided.has(value)), [decided, pool]);

    // The acknowledgements for a passed card. A list stored as one
    // newline-separated string, the same convention the intro's demo lyrics
    // use, so a translator edits copy rather than JSON structure.
    const passWords = useMemo(
        () => t('onboarding.quiz.deck.feedback_pass').split('\n').filter(Boolean),
        [t],
    );

    /**
     * The promises written for the five struggles we deal, as a plain list.
     *
     * Needed because a struggle the visitor WROTE has no promise of its own and
     * never can — there is no authoring a reply to a sentence nobody has read
     * yet. Keeping one of these ready means a written card still gets an answer
     * back instead of the raw lookup key, which is what it showed before.
     *
     * Built by asking for each one and dropping whatever fails to resolve: `t`
     * echoes the key back when there is nothing behind it, so this also covers
     * an option added to the quiz before its copy is written.
     */
    const keepPromises = useMemo(
        () =>
            options
                .map((o) => {
                    const key = `onboarding.quiz.deck.feedback_keep.${o.value}`;
                    const resolved = t(key);
                    return resolved === key ? null : resolved;
                })
                .filter((resolved): resolved is string => Boolean(resolved)),
        [options, t],
    );

    // The top card's live horizontal position, mirrored up from DeckCard. The
    // screen-wide colour wash reads straight off it, so the intensity is the
    // drag itself: further right, deeper green; further left, deeper amber;
    // let go and it retreats with the card. The fly-out animates this same
    // value to ±720, which is what completes the wash to full at the moment
    // of commitment — keyboard answers included, since they fly too.
    const dragX = useMotionValue(0);
    const keepWash = useTransform(dragX, [24, 280], [0, 0.2]);
    const passWash = useTransform(dragX, [-280, -24], [0.2, 0]);

    // The page hands us a fresh arrow each render, and the deck finishes from
    // inside a timeout — a ref keeps that timeout pointing at the current one.
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;
    const changeRef = useRef(onChange);
    changeRef.current = onChange;
    const stateRef = useRef(onStateChange);
    stateRef.current = onStateChange;

    // The answer is the cards that were kept — written ones included, since by
    // then they have been swiped like everything else.
    const answerOf = (ds: Decision[]) =>
        ds.filter((d) => d.direction === 'keep').map((d) => d.value);

    const flyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (flyTimeout.current) clearTimeout(flyTimeout.current);
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
    }, []);

    const decide = useCallback(
        (direction: Direction) => {
            if (leaving || queue.length === 0) return;

            const value = queue[0];
            const nextDecisions = [...decisions, { value, direction }];
            const nextKept = answerOf(nextDecisions);

            setLeaving(direction);
            // A keyboard answer counts as touching the deck too.
            setTouched(true);
            // The after-line. A kept struggle earns the promise written for
            // that struggle in particular — the one thing in the product that
            // answers it — and a passed one earns a short acknowledgement, so
            // the swipe that means "not me" still gets an answer back.
            const keepKey = `onboarding.quiz.deck.feedback_keep.${value}`;
            const keepLine = t(keepKey);
            setFlash({
                direction,
                at: Date.now(),
                text:
                    direction === 'pass'
                        ? passWords[Math.floor(Math.random() * passWords.length)] ?? ''
                        : keepLine !== keepKey
                          ? keepLine
                          // Nothing authored for this one — a struggle they
                          // wrote. Any of the promises is true of it, so one of
                          // them stands in rather than the card going unanswered.
                          : keepPromises[Math.floor(Math.random() * keepPromises.length)] ?? '',
            });
            if (flashTimeout.current) clearTimeout(flashTimeout.current);
            flashTimeout.current = setTimeout(() => setFlash(null), 1600);
            // Reported on the decision rather than on the card landing: Next
            // should come alive the moment a struggle is claimed, not 380ms
            // later once the animation happens to finish.
            changeRef.current(nextKept);

            flyTimeout.current = setTimeout(
                () => {
                    setLeaving(null);
                    // Recorded when the card lands, not when it is thrown: the
                    // moment this list grows, the card appears on its pile, and
                    // it should arrive there as the flying one leaves rather
                    // than beside it.
                    setDecisions(nextDecisions);
                    stateRef.current?.({ decisions: nextDecisions, written });
                    // The card that just left dragged the wash to full on its
                    // way out; ease it home so the next card starts on a clean
                    // screen instead of inheriting the colour.
                    animate(dragX, 0, { duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' });
                    // The last card leaving is the answer being given.
                    if (nextDecisions.length >= pool.length) completeRef.current(nextKept);
                },
                prefersReducedMotion ? 0 : FLY_MS,
            );
        },
        [decisions, dragX, keepPromises, leaving, passWords, pool.length, prefersReducedMotion, queue, t, written],
    );

    /**
     * Take a named card off its pile and put it back in the deck.
     *
     * A swipe is a fast, low-commitment gesture — that is the whole point of
     * the deck — which means it is also easy to send the wrong card away. The
     * piles are what make that recoverable by sight rather than by memory: the
     * answer is on screen, so getting one back is pointing at it, not undoing
     * an unknown number of steps.
     *
     * Restoring a kept card drops the value as well, otherwise the struggle
     * stays claimed on a card being offered again. The parent is told at once,
     * with the rewound count, so Next re-locks if this was the only answer.
     */
    const restore = useCallback(
        (value: string) => {
            if (leaving) return;

            const nextDecisions = decisions.filter((d) => d.value !== value);
            if (nextDecisions.length === decisions.length) return;

            setDecisions(nextDecisions);
            setFlash(null);
            // The card comes back to rest, not to wherever it was flung.
            animate(dragX, 0, { duration: 0 });
            changeRef.current(answerOf(nextDecisions));
            stateRef.current?.({ decisions: nextDecisions, written });
        },
        [decisions, dragX, leaving, written],
    );

    /**
     * Turn what has been typed into a card and deal it.
     *
     * The queue is empty when this is reachable, so the new card lands on top
     * immediately and the deck reappears around it — which is the point: the
     * struggle they wrote gets answered the same way as the ones we offered,
     * rather than being counted as claimed the moment it was typed.
     *
     * The answer is untouched here. Nothing has been decided yet.
     */
    const commitOwn = () => {
        const text = draft.trim().slice(0, OWN_MAX_LENGTH);
        setDraft('');
        if (!text) return;

        const value = `${CUSTOM_PREFIX}${text}`;
        if (pool.includes(value)) return;

        const nextWritten = [...written, value];
        setWritten(nextWritten);
        stateRef.current?.({ decisions, written: nextWritten });
    };

    const undo = useCallback(() => {
        const last = decisions[decisions.length - 1];
        if (last) restore(last.value);
    }, [decisions, restore]);

    // The whole deck is answerable from the keyboard, on the arrows that point
    // the same way as the swipe.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Not while a field has focus. The end card carries an always-live
            // input, and these two keys are exactly the ones used to move a
            // caret through what has been typed — swallowing them there would
            // make the text impossible to edit.
            const el = e.target as HTMLElement | null;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                decide('keep');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                decide('pass');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [decide]);

    const remaining = queue.slice(0, VISIBLE);

    return (
        // Short enough that the card, its hint and the quiz controls below all
        // sit on one screen — a card tall enough to push the controls under the
        // fold hides the way forward behind a scroll.
        <div className="flex flex-col items-center gap-8">
            {/* The whole screen answers WITH the hand: two fixed washes whose
                opacity reads live off the top card's drag — the further right,
                the deeper the brand green; the further left, the deeper the
                amber. Let the card snap back and the colour retreats with it;
                commit, and the fly-out carries the wash to full before it
                eases home. Peaks at 20% and pointer-events-none, so it tints
                the room without ever covering it. */}
            {!prefersReducedMotion && (
                <>
                    <motion.div
                        aria-hidden="true"
                        className="pointer-events-none fixed inset-0 z-40 bg-[#86BE7F]"
                        style={{ opacity: keepWash }}
                    />
                    <motion.div
                        aria-hidden="true"
                        className="pointer-events-none fixed inset-0 z-40 bg-[#FDE047]"
                        style={{ opacity: passWash }}
                    />
                </>
            )}

            {/* The card between its two answers.

                One grid rather than two layouts. On a phone the card takes both
                columns and the buttons sit under it in the second row; from
                `md` the `order` classes lay the three out side by side, so the
                same two button elements serve both arrangements and there is no
                second copy to keep in sync. Grid honours `order` when it
                auto-places, which is what makes that work.
             */}
            <div className="grid grid-cols-[auto_auto] items-center justify-items-center gap-x-4 gap-y-6 md:grid-cols-[auto_auto_auto] md:gap-x-7">
                {/* Spans both columns while it is stacked, one of three once it
                    is flanked. `order-2` puts it between the buttons without
                    moving it in the markup, where it belongs first: it is the
                    thing being answered, and a screen reader should reach it
                    before the two answers.

                    An explicit width, not `w-full max-w-[410px]`. The grid
                    tracks are `auto`, so a percentage width resolves against a
                    column that is itself sized to its contents — and every
                    child of this slot is `absolute`, so its contents measure
                    zero. The card collapsed to the width of the buttons beside
                    it. Stating the width outright is what keeps the track from
                    having to guess. */}
                <div className="relative col-span-2 h-[310px] w-[min(380px,calc(100vw-3rem))] shrink-0 md:col-span-1 md:order-2 md:h-[340px] md:w-[410px]">
                {/* The reply, above the card, as a bare line — no pill, no box;
                    a spoken aside rather than a notification.

                    It used to sit under the counter, at the very bottom of the
                    column, which put it below the fold on a laptop: the line
                    that answers a swipe was the one part of the swipe nobody
                    saw. Here it is in the first place the eye goes back to
                    after the card leaves.

                    Absolutely positioned rather than added to the flex column,
                    so it reserves no space and the card doesn't shift down by a
                    line's height to make room for something that is showing for
                    a second and a half at a time.

                    A kept struggle earns the promise that answers it; a passed
                    one earns a word of acknowledgement, in the neutral ink,
                    because nothing has been claimed and the line shouldn't read
                    as a reward. Both at normal weight — this is the deck
                    speaking back, and a bolder voice than the card's own turns
                    an aside into an announcement. */}
                <div className="pointer-events-none absolute inset-x-0 -top-8 z-20 flex justify-center">
                    <AnimatePresence>
                        {flash && (
                            <motion.p
                                key={flash.at}
                                className={`text-[14px] font-sans font-normal ${
                                    flash.direction === 'keep' ? 'text-[#5B8E54]' : 'text-stone-500'
                                }`}
                                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
                            >
                                {flash.text}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {remaining.length > 0 ? (
                    /* Painted back to front, so the card being answered is the
                       one on top of the stack and the one the pointer reaches
                       first. */
                    remaining
                        .map((value, depth) => ({ value, depth }))
                        .reverse()
                        .map(({ value, depth }) => (
                            <DeckCard
                                key={value}
                                depth={depth}
                                leaving={depth === 0 ? leaving : null}
                                hint={!touched}
                                label={
                                    isCustom(value)
                                        ? customText(value)
                                        : t(`onboarding.questions.${questionId}.options.${value}`)
                                }
                                reducedMotion={!!prefersReducedMotion}
                                dragX={dragX}
                                onDecide={decide}
                                onTouch={() => setTouched(true)}
                            />
                        ))
                ) : (
                    /* The deck is out, and the slot it left becomes a line to
                       type on.

                       Five options can't cover what stops a person writing, and
                       the deck's own shape says the opposite — five cards, five
                       answers, done. This is the same footprint drawn as a
                       socket rather than a card: nothing raised, nothing to
                       swipe yet, just the space where one more would go.

                       The field is live from the moment it appears rather than
                       behind a button that opens one. A button here asked for a
                       decision before the thought — press this, then think of
                       something — where a caret in an empty line asks only for
                       the thought. Nothing is required either way: leaving it
                       blank and pressing Next is a complete answer. */
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
                        className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#C6C7BB]/25 p-7 shadow-[inset_0_1px_5px_rgba(84,80,55,0.06)] ring-1 ring-inset ring-[#C6C7BB]/30 md:p-8"
                    >
                        <input
                            value={draft}
                            maxLength={OWN_MAX_LENGTH}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitOwn();
                                } else if (e.key === 'Escape') {
                                    setDraft('');
                                }
                            }}
                            onBlur={commitOwn}
                            placeholder={t('onboarding.quiz.deck.own_placeholder')}
                            className="w-full bg-transparent text-center text-[20px] font-sans font-normal leading-snug tracking-tight text-stone-900 outline-none placeholder:text-stone-500/70 md:text-[24px]"
                        />
                    </motion.div>
                )}
                </div>

                {/* Both directions go quiet with the last card — `decide` would
                    refuse them anyway. Hidden rather than unmounted: they hold
                    their grid columns, so the card does not slide sideways to a
                    new centre the moment the deck runs out. */}
                <button
                    type="button"
                    onClick={() => decide('pass')}
                    className={`${DIRECTION_BUTTON} md:order-1 ${
                        remaining.length > 0 ? '' : 'invisible pointer-events-none'
                    }`}
                >
                    <ArrowLeft className="h-4 w-4 stroke-[2.5px]" />
                    {t('onboarding.quiz.deck.pass')}
                </button>

                <button
                    type="button"
                    onClick={() => decide('keep')}
                    className={`${DIRECTION_BUTTON} md:order-3 ${
                        remaining.length > 0 ? '' : 'invisible pointer-events-none'
                    }`}
                >
                    {t('onboarding.quiz.deck.keep')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </div>

            {/* What is left under the deck once the two directions moved out
                beside the card: the position in it, and the way back one step.

                Undo belongs to the position, not to either direction, which is
                why it rides here rather than next to one of the buttons — over
                there it would read as a third way to answer. It sits in the
                flow with an empty box of its own width mirrored on the far side
                of the counter, so the counter stays on the deck's centre line
                whether the button is showing or not. Hanging it off the
                counter's edge with `absolute` kept the centring but gave the
                button no width to claim, and it reached across and sat on top
                of the label beside it.

                Hidden rather than disabled on the first card — there is nothing
                to go back to yet, and a permanently dead control in a row this
                quiet is noise. */}
            <div className="flex items-center justify-center gap-1 text-[13px] font-normal text-stone-400">
                <button
                    type="button"
                    onClick={undo}
                    aria-label={t('onboarding.quiz.deck.undo')}
                    title={t('onboarding.quiz.deck.undo')}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all hover:bg-stone-900/5 hover:text-stone-600 ${
                        decisions.length === 0 ? 'pointer-events-none opacity-0' : 'opacity-100'
                    }`}
                >
                    <Undo2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                </button>
                {t('onboarding.quiz.deck.counter')
                    .replace('{current}', String(Math.min(decisions.length + 1, pool.length)))
                    .replace('{total}', String(pool.length))}
                <span aria-hidden="true" className="h-6 w-6 shrink-0" />
            </div>

        </div>
    );
}

function DeckCard({
    depth,
    leaving,
    hint,
    label,
    reducedMotion,
    dragX,
    onDecide,
    onTouch,
}: {
    /** 0 is the card being answered; 1 sits behind it. */
    depth: number;
    leaving: Direction | null;
    /** Whether the deck is still unanswered — drives the idle sway below. */
    hint: boolean;
    label: string;
    reducedMotion: boolean;
    /** The deck's shared drag position — the colour wash reads off it. */
    dragX: MotionValue<number>;
    onDecide: (direction: Direction) => void;
    /** The visitor has put a pointer on the deck; the hint retires. */
    onTouch: () => void;
}) {
    const isTop = depth === 0;
    const showHint = hint && isTop && !leaving && !reducedMotion;

    const x = useMotionValue(0);
    // The top card narrates its position to the deck, which is what the
    // screen-wide wash reads. Only the top card speaks — the one behind never
    // moves horizontally anyway.
    useMotionValueEvent(x, 'change', (v) => {
        if (isTop) dragX.set(v);
    });
    // Everything else on the card is read off how far it has been dragged, so
    // the answer is legible before the card is let go of.
    const rotate = useTransform(x, [-260, 260], [-14, 14]);
    const keepOpacity = useTransform(x, [30, 150], [0, 1]);
    const passOpacity = useTransform(x, [-150, -30], [1, 0]);

    const flyTo = leaving === 'keep' ? 720 : leaving === 'pass' ? -720 : 0;

    return (
        <motion.div
            drag={isTop && !leaving ? 'x' : false}
            dragSnapToOrigin
            dragElastic={0.6}
            // The hint retires the moment a finger or pointer lands — a card
            // that keeps miming the gesture under a hand that's already doing
            // it would fight the drag.
            onDragStart={onTouch}
            onDragEnd={(_, info) => {
                if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onDecide('keep');
                else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onDecide('pass');
            }}
            style={{ x, rotate }}
            initial={false}
            // `x` is deliberately absent from the resting target: it is the
            // dragged axis, and a standing `x: 0` here would be a target framer
            // has already reached, so it would never re-fire after a drag and
            // the card would stay wherever it was dropped. `dragSnapToOrigin`
            // is what brings it home.
            animate={
                leaving
                    ? { x: flyTo, opacity: 0, scale: 1 }
                    : // The card behind sits lower and smaller, and rises into
                      // place as the one in front leaves.
                      { opacity: 1, scale: isTop ? 1 : 0.94, y: isTop ? 0 : 16 }
            }
            transition={
                reducedMotion
                    ? { duration: 0 }
                    : leaving
                      ? { duration: FLY_MS / 1000, ease: [0.32, 0, 0.67, 0] }
                      : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className={`absolute inset-0 select-none rounded-[32px] ${
                isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
            }`}
        >
            {/* The idle hint: the untouched top card leans both of the ways it
                can be swiped — right, then left, then home. It starts on
                arrival rather than after a beat, because a card that sits
                still for a second first has already been read as static by
                the time it moves.

                The throw is deliberately most of the way to `SWIPE_DISTANCE`
                without reaching it: far enough to name the gesture, short of
                the line where it would look like the card is committing to an
                answer on its own. Nearly symmetric for the same reason — the
                old version feinted right and only half-heartedly left, which
                read as a wobble rather than as two available directions.

                It lives on this inner wrapper because the outer element's `x`
                belongs to the drag; nesting the transforms means the sway can
                never fight a gesture, and it also keeps the sway out of
                `dragX`, so leaning the card never tints the screen with a
                wash the visitor didn't ask for. The first touch (onDragStart
                above) eases it back to rest mid-motion. */}
            <motion.div
                className="h-full w-full"
                animate={
                    showHint
                        ? { x: [0, 46, -38, 0], rotate: [0, 3.6, -3, 0] }
                        : { x: 0, rotate: 0 }
                }
                transition={
                    showHint
                        ? { duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.4 }
                        : { duration: 0.3, ease: 'easeOut' }
                }
            >
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#F3F5E8_0%,#E7EDDC_55%,#DDE7CF_100%)] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-stone-300/40 md:p-8">
                {/* Tints that grow with the drag, so the card itself takes on the
                    answer rather than only the stamp in the corner. */}
                <motion.div
                    aria-hidden="true"
                    style={{ opacity: isTop ? keepOpacity : 0 }}
                    className="pointer-events-none absolute inset-0 rounded-[32px] bg-[#86BE7F]/20 ring-2 ring-inset ring-[#86BE7F]"
                />
                <motion.div
                    aria-hidden="true"
                    style={{ opacity: isTop ? passOpacity : 0 }}
                    className="pointer-events-none absolute inset-0 rounded-[32px] bg-stone-500/10 ring-2 ring-inset ring-stone-400"
                />

                {/* Top left, always. It sat on the bottom edge back when worded
                    stamps needed the upper half of the card to themselves;
                    those are long gone, and a sentence that starts at the
                    bottom means every card is read from a different place
                    depending on how many lines it runs to. Anchored to the top
                    corner, five cards in a row all begin at the same point. */}
                {/* No worded stamps here any more — the card used to shout
                    "That's me" / "Not me" as it moved, which made every swipe
                    feel like signing something. The growing tint and ring
                    above say the same thing without words, and the swipe
                    stays light. */}
                <p className="relative text-[34px] font-sans font-medium leading-[1.15] tracking-tight text-stone-900 md:text-[38px]">
                    {label}
                </p>
            </div>
            </motion.div>
        </motion.div>
    );
}
