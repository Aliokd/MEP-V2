"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { customText, isCustom } from './GoalBox';
import { PRIMARY_BUTTON } from './buttonStyles';
import PlanSections from './PlanSections';

// The payoff for the quiz, in four parts, read top to bottom:
//
//   1. Who they are      — read off `songwriter_type`.
//   2. What's in the way — read off `struggle`, so the sore spot they named is
//                          said back to them before anything is sold.
//   3. What we do        — the same struggles answered one for one, in plain
//                          words, naming the actual thing in the product that
//                          deals with each.
//   4. Where this goes   — read off `dream_outcome`, stated as a promise.
//
// Every line is one of their own answers turned around. That is the difference
// between a screen that flatters and one that convinces: nothing here would
// make sense to a visitor who answered differently.
//
// The four parts arrive in that order, a beat apart, rather than all at once.
// A page this personal landing complete in a single paint reads as a page that
// was already written; laid down block by block it reads as a result being
// stated, and it puts the eye at the top of the page rather than anywhere in it.
//
// It replaced a skeleton of the whole page, swept, that held for two seconds
// before any of this appeared. That is the same wait spent worse: bars where
// the words go say "not yet" three times over, and everything they were
// standing in for arrived in one go anyway.
//
// Every block keeps its space from the first paint and only fades in, so
// nothing below it moves as the one above lands, and the button does not walk
// down the screen under a cursor already reaching for it.
const STEP_MS = 800;

/** How many of the visitor's struggles are said back. See the note below. */
const MAX_STRUGGLES = 2;

// Any answer we don't have a line for — including no answer at all, since the
// quiz lets a question be deselected — falls back to copy that reads naturally
// without knowing anything about them.
const line = (t: (k: string) => string, group: string, value: string | null) => {
    const key = `onboarding.verdict.${group}.${value ?? 'default'}`;
    const resolved = t(key);
    // `t` echoes the key back when it can't resolve it.
    return resolved === key ? t(`onboarding.verdict.${group}.default`) : resolved;
};

export default function VerdictReveal({ answers, onContinue }: {
    answers: Record<string, string | string[]>;
    onContinue: () => void;
}) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    /**
     * How many of the three blocks have landed. Starts at 0 on every render
     * path including the server's, so the markup that hydrates is the markup
     * that was sent, and the first block is brought in by the timer below like
     * the other two rather than being special-cased.
     *
     * Reduced motion gets all three at once: without the fade there is nothing
     * to see arriving, and the beats would only be a page revealing itself in
     * silence over two and a half seconds.
     */
    const [shown, setShown] = useState(0);
    const revealed = (block: number) => prefersReducedMotion || shown >= block;

    useEffect(() => {
        if (prefersReducedMotion) return;
        const timers = [1, 2, 3, 4].map((block) =>
            setTimeout(() => setShown(block), STEP_MS * (block - 1)),
        );
        return () => timers.forEach(clearTimeout);
    }, [prefersReducedMotion]);

    // Every question but the struggle deck answers with a single value.
    const one = (value: string | string[] | undefined) =>
        (Array.isArray(value) ? value[0] : value) ?? null;

    const identity = line(t, 'types', one(answers.songwriter_type));
    const identityDesc = line(t, 'type_notes', one(answers.songwriter_type));

    // Goals can be several, and one of them may be a goal the visitor wrote
    // themselves — which has no promise written for it. The first one we do
    // have a line for wins, so a custom goal alongside a known one still gets
    // the specific sentence rather than dropping the whole beat to its default.
    const goals = Array.isArray(answers.dream_outcome)
        ? answers.dream_outcome
        : [answers.dream_outcome ?? null];
    const promise = line(
        t,
        'dreams',
        goals.find((value) => value && !isCustom(value)) ?? null,
    );

    // The deck can be answered with several struggles, and each was a separate
    // yes — so each is said back, rather than picking one and quietly dropping
    // the rest. No answer at all falls through to the one default line.
    //
    // Capped at two. Someone who swiped right on all five got five paragraphs
    // about what is wrong with them, one after another, before anything on the
    // page offered a way out of it — and the fifth said nothing the first two
    // hadn't. The answer to all of them is the same three tiles underneath.
    //
    // The `fixes` that used to be paired with these are gone from the render;
    // the lines are still in the locale files, and are what the sections below
    // say in pictures instead.
    // One of them may be a struggle the visitor wrote at the end of the deck.
    // There is no authored line for it — there can't be — but its own text is
    // already the sentence this beat wants: the problem in their words. Passing
    // it through `line` instead would resolve nothing and fall back to the
    // generic default, which would say something bland about a struggle they had
    // just taken the trouble to describe. The fix beside it still falls back,
    // since what Veinote does about it is the part we genuinely can't know.
    const struggles = Array.isArray(answers.struggle)
        ? answers.struggle
        : [answers.struggle ?? null];
    const understandings = struggles
        .slice(0, MAX_STRUGGLES)
        .map((value) =>
            value && isCustom(value) ? customText(value) : line(t, 'struggles', value),
        );

    return (
        <motion.div
            key="verdict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10 text-center"
        >
            {/* Each block arrives a beat after the one above it, top to bottom,
                in the order it is read in.

                Driven by a class the browser transitions rather than by a
                motion value driven from JS: what is being animated here is the
                page's own content appearing, and an animation that stalls
                mid-way — a tab that isn't compositing frames will do it — is a
                verdict left invisible. A CSS transition that never runs still
                ends at the state the class says. */}
            <div
                className={`space-y-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    revealed(1) ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
            >
                {/* The headline names what this page is, not what it says.
                    The reading of them — "you're an Explorer" — is the line
                    under it: it is still the first thing after the title and
                    still the biggest sentence on the page, but it now arrives
                    as an observation rather than as a verdict pronounced on
                    someone, which is also what the button under it promises
                    there is more of. */}
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.5rem]">
                    {t('onboarding.verdict.headline')}
                </h1>

                <p className="mx-auto max-w-xl text-2xl font-sans font-light leading-snug text-stone-900 md:text-[1.75rem]">
                    {identity}
                </p>

                <p className="mx-auto max-w-lg text-lg font-medium text-stone-700/80">
                    {identityDesc}
                </p>
            </div>

            {/* The problem, and then — in pictures rather than prose — what
                is done about it.

                The panel used to carry both halves: the struggle above a rule,
                a paragraph of answer below it. The answer moved out to the
                three tiles under this, and the panel kept the half it was good
                at. What is in the way is the one thing on this page the visitor
                said themselves, and it reads harder alone. */}
            <div
                className={`rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] px-7 py-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:px-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    revealed(2) ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
            >
                <p className="text-[15px] font-medium text-stone-500">
                    {t('onboarding.verdict.struggle_label')}
                </p>
                <div className="mt-3 space-y-3">
                    {understandings.map((understanding, i) => (
                        <p
                            key={i}
                            className="text-xl font-sans font-light leading-snug text-[#363636] md:text-2xl"
                        >
                            {understanding}
                        </p>
                    ))}
                </div>
            </div>

            <div
                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    revealed(3) ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
            >
                <PlanSections />
            </div>

            <div
                className={`space-y-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    revealed(4) ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
            >
                <p className="text-[15px] font-medium text-stone-500">
                    {t('onboarding.verdict.promise_label')}
                </p>
                <p className="mx-auto max-w-xl text-2xl font-sans font-light italic leading-snug text-stone-900 md:text-[2rem]">
                    {promise}
                </p>
            </div>

            {/* The way on, pinned to the bottom of the viewport rather than
                sitting at the end of the page. This page is taller than a
                screen on every window we have, and a button that has to be
                scrolled to is a button a visitor has to go looking for at the
                exact moment they have decided to move.

                Outside the staged reveal, too: the blocks above are paced, but
                the way out of a screen is not a reward to be earned by waiting.
                It is there from the first paint.

                The pane under it is the quiz's: the page's own colour, held
                translucent and blurred, so the pill has something to sit on
                over whatever the painted backdrop is doing behind it. */}
            <div className="sticky bottom-4 z-40 mx-auto flex w-fit max-w-full items-center justify-center rounded-full bg-[#DCDDD4]/35 px-4 py-2.5 backdrop-blur-2xl backdrop-saturate-150">
                <button type="button" onClick={onContinue} className={PRIMARY_BUTTON}>
                    {t('onboarding.verdict.cta')}
                    <ArrowRight className="h-5 w-5 stroke-[2.75px]" />
                </button>
            </div>
        </motion.div>
    );
}
