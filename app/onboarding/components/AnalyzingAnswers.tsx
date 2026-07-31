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

export default function AnalyzingAnswers({ answers, onComplete }: {
    /** The visitor's own answers, already resolved to their display labels. */
    answers: string[];
    onComplete: () => void;
}) {
    const { t } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    const [read, setRead] = useState(0);

    // The page passes an inline arrow here, so a bare dependency on it would
    // restart every timer on each render and the screen would never advance.
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;

    useEffect(() => {
        if (prefersReducedMotion) {
            setRead(answers.length);
            const id = setTimeout(() => completeRef.current(), 900);
            return () => clearTimeout(id);
        }

        const timers = answers.map((_, i) =>
            setTimeout(() => setRead(i + 1), ROW_MS * (i + 1)),
        );
        timers.push(setTimeout(() => completeRef.current(), ROW_MS * answers.length + WEIGH_MS));

        return () => timers.forEach(clearTimeout);
    }, [answers.length, prefersReducedMotion]);

    const allRead = read >= answers.length;

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

            {/* The closing line only appears once every answer is in, so it
                reads as the conclusion of the pass rather than a caption. */}
            <motion.p
                initial={false}
                animate={{ opacity: allRead ? 1 : 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
                className="text-center text-[15px] font-medium italic text-stone-600"
            >
                {t('onboarding.analyzing.done')}
            </motion.p>
        </motion.div>
    );
}
