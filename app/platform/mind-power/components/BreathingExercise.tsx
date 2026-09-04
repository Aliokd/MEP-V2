"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import * as btn from '@/app/platform/components/buttonStyles';
import { recordHealthMark } from '@/lib/weeklyActivity';

/**
 * Box breathing, guided: four seconds in, four held, four out, four held, for
 * six rounds — about two minutes, the length of a verse and a chorus. A circle
 * grows on the in-breath, rests full, shrinks on the out-breath, rests empty;
 * the word for the phase sits inside it with the seconds left in that phase.
 *
 * Timed on the wall clock, not animation frames, so a tab that loses focus
 * mid-exercise does not lose the count. Under reduced motion the circle stays
 * still and the words do the guiding.
 */

const PHASE_SECONDS = 4;
const ROUNDS = 6;
const PHASES = ['in', 'hold', 'out', 'hold'] as const;
type Phase = typeof PHASES[number];
const TICK_MS = 100;

interface BreathingExerciseProps {
    open: boolean;
    onClose: () => void;
    t: (key: string) => string;
}

type Stage = 'intro' | 'running' | 'done';

export default function BreathingExercise({ open, onClose, t }: BreathingExerciseProps) {
    const reduceMotion = useReducedMotion();
    const [stage, setStage] = useState<Stage>('intro');
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [round, setRound] = useState(1);
    const [secondsLeft, setSecondsLeft] = useState(PHASE_SECONDS);
    const startedAt = useRef(0);

    const reset = useCallback(() => {
        setStage('intro');
        setPhaseIndex(0);
        setRound(1);
        setSecondsLeft(PHASE_SECONDS);
    }, []);

    useEffect(() => {
        if (!open) reset();
    }, [open, reset]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // One clock for the whole exercise: the elapsed time says which round,
    // which phase and how many seconds of it remain.
    useEffect(() => {
        if (stage !== 'running') return;
        startedAt.current = performance.now();
        const total = ROUNDS * PHASES.length * PHASE_SECONDS;
        const id = setInterval(() => {
            const elapsed = (performance.now() - startedAt.current) / 1000;
            if (elapsed >= total) {
                clearInterval(id);
                setStage('done');
                // Finished: a health mark for the day.
                recordHealthMark('breathing');
                return;
            }
            const slot = Math.floor(elapsed / PHASE_SECONDS);
            setRound(Math.floor(slot / PHASES.length) + 1);
            setPhaseIndex(slot % PHASES.length);
            setSecondsLeft(Math.max(1, Math.ceil(PHASE_SECONDS - (elapsed - slot * PHASE_SECONDS))));
        }, TICK_MS);
        return () => clearInterval(id);
    }, [stage]);

    if (!open || typeof document === 'undefined') return null;

    const phase: Phase = PHASES[phaseIndex];
    const full = stage === 'running' && (phase === 'in' || (phase === 'hold' && phaseIndex === 1));
    const phaseLabel = t(phase === 'in' ? 'progress.breath_in' : phase === 'out' ? 'progress.breath_out' : 'progress.breath_hold');
    const circleScale = reduceMotion ? 1 : full ? 1 : 0.62;
    const circleTransition = reduceMotion
        ? 'none'
        : phase === 'in' || phase === 'out'
          ? `transform ${PHASE_SECONDS}s cubic-bezier(0.45, 0, 0.55, 1)`
          : 'none';

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('progress.breath_title')}
                data-breathing
                data-stage={stage}
                data-phase={stage === 'running' ? phase : undefined}
                onClick={e => e.stopPropagation()}
                className="golden-pop-in relative w-full max-w-[520px] rounded-3xl bg-[#2a2a2a] px-6 py-10 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-10 flex flex-col items-center gap-8 text-center"
            >
                <h2 className="font-lyrics font-normal text-[28px] leading-none">{t('progress.breath_title')}</h2>

                {stage === 'intro' && (
                    <>
                        <p className="max-w-sm text-[14px] leading-relaxed text-stone-400">{t('progress.breath_intro')}</p>
                        <button type="button" onClick={() => setStage('running')} className={btn.primary('md')} data-begin>
                            {t('progress.breath_begin')}
                        </button>
                    </>
                )}

                {stage === 'running' && (
                    <>
                        {/* The circle: a soft green disc that breathes. */}
                        <div className="relative flex h-[240px] w-[240px] items-center justify-center" aria-hidden>
                            <div
                                className="absolute inset-0 rounded-full bg-[#86BE7F]/20"
                                style={{ transform: `scale(${circleScale})`, transition: circleTransition }}
                            />
                            <div
                                className="absolute inset-[18px] rounded-full bg-[#86BE7F]/40"
                                style={{ transform: `scale(${circleScale})`, transition: circleTransition }}
                            />
                            <div className="relative flex flex-col items-center gap-1">
                                <span className="font-lyrics text-[30px] leading-none" data-phase-label>{phaseLabel}</span>
                                <span className="font-lyrics text-[22px] leading-none text-stone-300 tabular-nums">{secondsLeft}</span>
                            </div>
                        </div>
                        <p className="text-[13px] text-stone-500 tabular-nums" aria-live="polite">
                            {t('progress.breath_round').replace('{n}', String(round)).replace('{total}', String(ROUNDS))}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-[14px] text-stone-300 underline decoration-stone-500 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] cursor-pointer"
                        >
                            {t('progress.breath_stop')}
                        </button>
                    </>
                )}

                {stage === 'done' && (
                    <>
                        <div className="flex flex-col gap-2">
                            <p className="font-lyrics text-[26px] leading-tight text-[#A9DE9F]">{t('progress.breath_done_title')}</p>
                            <p className="text-[14px] text-stone-400">{t('progress.breath_done_text')}</p>
                        </div>
                        <button type="button" onClick={onClose} className={btn.primary('md')}>
                            {t('progress.breath_close')}
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
