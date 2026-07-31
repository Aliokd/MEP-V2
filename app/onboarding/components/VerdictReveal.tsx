"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { isCustom } from './GoalBox';

// The payoff for the quiz, in three beats that land one after another:
//
//   1. Who they are      — read off `songwriter_type`.
//   2. What's in the way — read off `struggle`, so the sore spot they named is
//                          said back to them before anything is sold.
//   3. Where this goes   — read off `dream_outcome`, stated as a promise.
//
// Every line is one of their own answers turned around. That is the difference
// between a screen that flatters and one that convinces: nothing here would
// make sense to a visitor who answered differently.
//
// The beats are timed rather than clicked through. Three taps to read three
// sentences is friction on the one screen whose whole job is momentum — but the
// continue button waits for the last beat, so nobody is hurried past the point.
const BEAT_MS = 1500;
const BEATS = 3;

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
    const [beat, setBeat] = useState(prefersReducedMotion ? BEATS : 0);

    const continueRef = useRef(onContinue);
    continueRef.current = onContinue;

    useEffect(() => {
        if (prefersReducedMotion) return;

        const timers = Array.from({ length: BEATS }, (_, i) =>
            setTimeout(() => setBeat(i + 1), BEAT_MS * (i + 1)),
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
    const struggles = Array.isArray(answers.struggle)
        ? answers.struggle
        : [answers.struggle ?? null];
    const understandings = struggles.map((value) => line(t, 'struggles', value));

    const reveal = (at: number) => ({
        initial: false as const,
        animate: { opacity: beat >= at ? 1 : 0, y: beat >= at ? 0 : 14 },
        transition: prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    });

    return (
        <motion.div
            key="verdict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10 text-center"
        >
            <div className="space-y-6">
                <motion.p {...reveal(1)} className="text-sm font-medium text-stone-500">
                    {t('onboarding.verdict.label')}
                </motion.p>

                <motion.h1
                    {...reveal(1)}
                    className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.5rem]"
                >
                    {identity}
                </motion.h1>

                <motion.p
                    {...reveal(1)}
                    className="mx-auto max-w-lg text-lg font-medium text-stone-700/80"
                >
                    {identityDesc}
                </motion.p>
            </div>

            {/* Beat two sits in its own panel: it's the uncomfortable sentence,
                and giving it a frame stops it reading as more of the flattery
                above. */}
            <motion.div
                {...reveal(2)}
                className="rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] px-7 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:px-10"
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
            </motion.div>

            <motion.div {...reveal(3)} className="space-y-8">
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
                    // Kept out of the tab order until its beat has landed, so a
                    // keyboard user can't focus a button that isn't there yet.
                    tabIndex={beat >= BEATS ? 0 : -1}
                    className="mx-auto flex items-center gap-2 rounded-full bg-[#86BE7F] px-10 py-4 text-base font-semibold text-stone-900 shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                >
                    {t('onboarding.verdict.cta')}
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                </button>
            </motion.div>
        </motion.div>
    );
}
