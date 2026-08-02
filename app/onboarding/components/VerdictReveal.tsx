"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { customText, isCustom } from './GoalBox';
import { PRIMARY_BUTTON } from './buttonStyles';

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
// The three beats used to arrive on a timer, 1.5s apart, with the button held
// back until the last one. They are gone: arriving at the payoff to find it
// doled out over four and a half seconds turns a reward into another queue.
// Everything lands in one paint, in the order it reads, and the reading itself
// is what paces it.
//
// What is timed is what comes *before* that paint: a skeleton of the page,
// swept, while the result is "put together". That wait was the analysis
// screen's job until it stopped moving on by itself and started waiting to be
// pressed — so the beat between asking for the result and getting it had
// vanished, and a page this personal appearing the instant a button is pressed
// reads as a page that was already written. It is one short hold, and it is the
// last one in the flow.
const BUILD_MS = 1900;

// Any answer we don't have a line for — including no answer at all, since the
// quiz lets a question be deselected — falls back to copy that reads naturally
// without knowing anything about them.
const line = (t: (k: string) => string, group: string, value: string | null) => {
    const key = `onboarding.verdict.${group}.${value ?? 'default'}`;
    const resolved = t(key);
    // `t` echoes the key back when it can't resolve it.
    return resolved === key ? t(`onboarding.verdict.${group}.default`) : resolved;
};

const Bar = ({ className, tone = 'bg-stone-400/20' }: { className: string; tone?: string }) => (
    <div className={`rounded-full ${tone} ${className}`} />
);

/**
 * The page before it is the page: the same four blocks, the same panel, the
 * same button, drawn as bars at roughly the widths the real lines run to.
 *
 * Built to the real layout rather than as a generic spinner because that is the
 * whole trick — what is being waited for is visibly a result about them, taking
 * shape, and nothing lands anywhere the eye wasn't already looking. It is not
 * pixel-matched, and it doesn't need to be: the verdict's own lines vary in
 * length by answer and by language, so an exact match is not a thing that
 * exists.
 */
const VerdictSkeleton = () => (
    <div aria-hidden="true" className="relative space-y-10 overflow-hidden">
        <div className="flex flex-col items-center space-y-6">
            <Bar className="h-3.5 w-32" />
            <Bar className="h-11 w-[min(26rem,88%)] md:h-14" />
            <div className="flex w-full flex-col items-center space-y-2.5">
                <Bar className="h-4 w-[70%]" />
                <Bar className="h-4 w-[46%]" />
            </div>
        </div>

        <div className="rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] px-7 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:px-10">
            <div className="flex flex-col items-center space-y-4">
                <Bar className="h-3.5 w-40" />
                <Bar className="h-6 w-[88%]" />
                <Bar className="h-6 w-[64%]" />
            </div>
            <div className="mt-8 flex flex-col items-center space-y-3.5 border-t border-stone-300/60 pt-7">
                <Bar className="h-3.5 w-36" tone="bg-[#3f6b3a]/20" />
                <Bar className="h-4 w-[78%]" />
                <Bar className="h-4 w-[66%]" />
            </div>
        </div>

        <div className="flex flex-col items-center space-y-8">
            <div className="flex w-full flex-col items-center space-y-3">
                <Bar className="h-3.5 w-28" />
                <Bar className="h-7 w-[74%]" />
            </div>
            <Bar className="h-14 w-52" tone="bg-[#86BE7F]/35" />
        </div>

        {/* The band that says the wait is work rather than a stall. One sweep
            over the whole stack, not one per bar: several running at once reads
            as decoration, and this has to read as a single pass over a single
            thing being assembled. */}
        <div
            className="verdict-skeleton-sweep pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />
    </div>
);

export default function VerdictReveal({ answers, onContinue }: {
    answers: Record<string, string | string[]>;
    onContinue: () => void;
}) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    // Starts building on every render path, including the server's, so the
    // markup that hydrates is the markup that was sent. Reduced motion drops
    // out of it on the first effect instead of never entering: the hold is
    // built out of a moving band and a staggered arrival, and with both of
    // those off it is not a build-up any more — just a page that takes two
    // seconds to appear.
    const [building, setBuilding] = useState(true);

    useEffect(() => {
        if (prefersReducedMotion) {
            setBuilding(false);
            return;
        }
        const id = setTimeout(() => setBuilding(false), BUILD_MS);
        return () => clearTimeout(id);
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
    // Each one is said back twice: the problem in their words, and then what
    // Veinote does about that exact problem. Naming the sore spot and stopping
    // there is just a diagnosis, and a diagnosis is not a reason to pay for
    // anything — the answer has to be in the same panel as the complaint, in
    // the same order, so the pairing needs no explaining.
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
    const understandings = struggles.map((value) =>
        value && isCustom(value) ? customText(value) : line(t, 'struggles', value),
    );
    const fixes = struggles.map((value) => line(t, 'fixes', value));

    return (
        <motion.div
            key="verdict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10 text-center"
        >
            {building ? <VerdictSkeleton /> : <>
            {/* Each block arrives a beat after the one above it — top to
                bottom, the order it is read in, and quick enough that all three
                are on screen before the first one has been finished. It is the
                skeleton resolving rather than three more waits: the page is
                already there, and this is it coming into focus. */}
            <motion.div
                className="space-y-6"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                <p className="text-sm font-medium text-stone-500">
                    {t('onboarding.verdict.label')}
                </p>

                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.5rem]">
                    {identity}
                </h1>

                <p className="mx-auto max-w-lg text-lg font-medium text-stone-700/80">
                    {identityDesc}
                </p>
            </motion.div>

            {/* The problem and the answer to it, in one panel split across the
                middle: what's in the way above the rule, what we do about it
                below. Giving the uncomfortable half a frame stops it reading as
                more of the flattery above, and keeping the answer inside the
                same frame stops the problem sitting on the screen alone. */}
            <motion.div
                className="rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] px-7 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:px-10"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
                <p className="text-[15px] font-medium text-stone-500">
                    {t('onboarding.verdict.struggle_label')}
                </p>
                <div className="mt-3 space-y-4">
                    {understandings.map((understanding, i) => (
                        <p
                            key={i}
                            className="text-xl font-sans font-light leading-snug text-[#363636] md:text-2xl"
                        >
                            {understanding}
                        </p>
                    ))}
                </div>

                {/* The fixes are set smaller and darker than the problems
                    above, not larger. The complaint is the line that has to
                    land — this half is the reply, and a reply that shouts over
                    the thing it answers reads as a pitch. */}
                <div className="mt-8 border-t border-stone-300/60 pt-7">
                    <p className="text-[15px] font-medium text-[#3f6b3a]">
                        {t('onboarding.verdict.fix_label')}
                    </p>
                    <div className="mt-3 space-y-3.5">
                        {fixes.map((fix, i) => (
                            <p
                                key={i}
                                className="mx-auto max-w-xl text-[16px] font-medium leading-relaxed text-stone-700 md:text-[17px]"
                            >
                                {fix}
                            </p>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div
                className="space-y-8"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="space-y-3">
                    <p className="text-[15px] font-medium text-stone-500">
                        {t('onboarding.verdict.promise_label')}
                    </p>
                    <p className="mx-auto max-w-xl text-2xl font-sans font-light italic leading-snug text-stone-900 md:text-[2rem]">
                        {promise}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onContinue}
                    className={`${PRIMARY_BUTTON} mx-auto`}
                >
                    {t('onboarding.verdict.cta')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </motion.div>
            </>}
        </motion.div>
    );
}
