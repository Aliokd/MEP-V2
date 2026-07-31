"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

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
// never travels far.
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 520;

// How long the card takes to leave. The next card is only promoted once it has,
// so this is also the beat between one answer and the next question.
const FLY_MS = 380;

// Cards visible at once: the one being answered and the one behind it. Any
// deeper and the stack starts to read as a pile rather than a queue.
const VISIBLE = 2;

type Direction = 'keep' | 'pass';

interface SwipeDeckProps {
    questionId: string;
    options: { value: string }[];
    /** Every decision, so the answer is current before the deck runs out. */
    onChange: (kept: string[]) => void;
    /** The last card has left. */
    onComplete: (kept: string[]) => void;
}

export default function SwipeDeck({ questionId, options, onChange, onComplete }: SwipeDeckProps) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();

    const [index, setIndex] = useState(0);
    const [kept, setKept] = useState<string[]>([]);
    // The direction the top card is currently leaving in, if it is leaving.
    // Also what locks the deck: no second decision lands mid-flight.
    const [leaving, setLeaving] = useState<Direction | null>(null);

    // The page hands us a fresh arrow each render, and the deck finishes from
    // inside a timeout — a ref keeps that timeout pointing at the current one.
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;
    const changeRef = useRef(onChange);
    changeRef.current = onChange;

    const flyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (flyTimeout.current) clearTimeout(flyTimeout.current);
    }, []);

    const decide = useCallback(
        (direction: Direction) => {
            if (leaving || index >= options.length) return;

            const value = options[index].value;
            const nextKept = direction === 'keep' ? [...kept, value] : kept;

            setKept(nextKept);
            setLeaving(direction);
            // Reported on the decision rather than on the card landing: Next
            // should come alive the moment a struggle is claimed, not 380ms
            // later once the animation happens to finish.
            changeRef.current(nextKept);

            flyTimeout.current = setTimeout(
                () => {
                    setLeaving(null);
                    setIndex(index + 1);
                    // The last card leaving is the answer being given.
                    if (index + 1 >= options.length) completeRef.current(nextKept);
                },
                prefersReducedMotion ? 0 : FLY_MS,
            );
        },
        [index, kept, leaving, options, prefersReducedMotion],
    );

    // The whole deck is answerable from the keyboard, on the arrows that point
    // the same way as the swipe.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
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

    const remaining = options.slice(index, index + VISIBLE);

    return (
        // Short enough that the card, its hint and the quiz controls below all
        // sit on one screen — a card tall enough to push the controls under the
        // fold hides the way forward behind a scroll.
        <div className="flex flex-col items-center gap-5">
            <div className="relative h-[268px] w-full max-w-[330px] shrink-0 md:h-[292px] md:max-w-[350px]">
                {/* Painted back to front, so the card being answered is the one
                    on top of the stack and the one the pointer reaches first. */}
                {remaining
                    .map((option, depth) => ({ option, depth }))
                    .reverse()
                    .map(({ option, depth }) => (
                        <DeckCard
                            key={option.value}
                            depth={depth}
                            leaving={depth === 0 ? leaving : null}
                            label={t(`onboarding.questions.${questionId}.options.${option.value}`)}
                            counter={t('onboarding.quiz.deck.counter')
                                .replace('{current}', String(index + depth + 1))
                                .replace('{total}', String(options.length))}
                            keepLabel={t('onboarding.quiz.deck.keep')}
                            passLabel={t('onboarding.quiz.deck.pass')}
                            reducedMotion={!!prefersReducedMotion}
                            onDecide={decide}
                        />
                    ))}
            </div>

            {/* The buttons are gone and this is what stands in for them: not a
                control, a legend. It names the gesture and which way each answer
                lies, using the same two words the card stamps on itself once you
                start dragging — so the hint and the thing it explains are
                written in the same language.

                It also has to carry the keyboard, which the buttons used to make
                obvious. The arrows here are the arrow keys: both still answer
                the card. */}
            <p className="flex items-center gap-2.5 text-[13px] font-medium text-stone-500">
                <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5px]" aria-hidden="true" />
                {t('onboarding.quiz.deck.pass')}
                <span aria-hidden="true" className="text-stone-400">·</span>
                {t('onboarding.quiz.deck.keep')}
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5px]" aria-hidden="true" />
            </p>
        </div>
    );
}

function DeckCard({
    depth,
    leaving,
    label,
    counter,
    keepLabel,
    passLabel,
    reducedMotion,
    onDecide,
}: {
    /** 0 is the card being answered; 1 sits behind it. */
    depth: number;
    leaving: Direction | null;
    label: string;
    counter: string;
    keepLabel: string;
    passLabel: string;
    reducedMotion: boolean;
    onDecide: (direction: Direction) => void;
}) {
    const isTop = depth === 0;

    const x = useMotionValue(0);
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
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-[#EFF0E7] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-stone-300/40 md:p-8">
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

                <div className="relative flex items-start justify-between">
                    <span className="text-[13px] font-semibold text-stone-500">{counter}</span>
                </div>

                {/* Pushed to the bottom: the sentence is the card, and reading it
                    against the lower edge leaves the drag stamps their own air. */}
                <p className="relative mt-auto text-[25px] font-sans font-light leading-[1.25] tracking-tight text-[#363636] md:text-[28px]">
                    {label}
                </p>

                <motion.span
                    aria-hidden="true"
                    style={{ opacity: isTop ? keepOpacity : 0 }}
                    className="pointer-events-none absolute right-6 top-6 flex -rotate-[8deg] items-center gap-1.5 rounded-full bg-[#86BE7F] px-4 py-2 text-[13px] font-semibold text-stone-900 shadow-sm"
                >
                    <Check className="h-3.5 w-3.5 stroke-[3px]" />
                    {keepLabel}
                </motion.span>

                <motion.span
                    aria-hidden="true"
                    style={{ opacity: isTop ? passOpacity : 0 }}
                    className="pointer-events-none absolute left-6 top-6 flex rotate-[8deg] items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-stone-600 shadow-sm ring-1 ring-stone-300"
                >
                    <X className="h-3.5 w-3.5 stroke-[3px]" />
                    {passLabel}
                </motion.span>
            </div>
        </motion.div>
    );
}
