"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Mic, Square, RotateCcw, Shuffle, Loader2, Music4 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/lib/haptics';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import { VARIATION_TASKS, firstPlayableMelody, type PracticeMelody } from '../data/melodies';
import { useMelodyLibrary } from '../lib/library';
import { useRecorder } from '../lib/useRecorder';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import MelodyClip from './MelodyClip';

/*
 * Practice 3 — melody variation.
 *
 * Pick a melody, hear it, get one thing to change, play your version into the
 * microphone, then hear the two back to back. No pitch detection, no MIDI and
 * no analysis: the judgement is the listener's, and the exercise's whole job is
 * to make the comparison easy to make.
 *
 * Its own component rather than more branches inside PracticeTab, which is
 * already carrying Practice 2's six steps inline at around 400 lines.
 */

/** Shared with Practice 2 so the three exercises are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3, 4] as const;
/** A take longer than this is a performance, not a variation. */
const MAX_TAKE_SECONDS = 90;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

interface MelodyVariationProps {
    onBack: () => void;
}

export default function MelodyVariation({ onBack }: MelodyVariationProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    // Authored in the admin console; falls back to the bundled list.
    const melodies = useMelodyLibrary();
    const [melody, setMelody] = useState<PracticeMelody | null>(() => firstPlayableMelody());
    const [taskIdx, setTaskIdx] = useState(() => Math.floor(Math.random() * VARIATION_TASKS.length));
    /** Which clip is sounding, if any. One at a time, always. */
    const [playing, setPlaying] = useState<'original' | 'take' | null>(null);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');

    const { isRecording, seconds, take, error: micError, start, stop, discard } =
        useRecorder({ maxSeconds: MAX_TAKE_SECONDS });
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const task = VARIATION_TASKS[taskIdx];
    const playable = melodies.filter(m => m.available);

    /*
     * The starting melody is chosen from the bundled list at mount, because the
     * exercise needs one before a fetch can land. When the console's library
     * arrives it replaces that — unless the songwriter has already picked one
     * that is still on offer, in which case their choice stands.
     */
    useEffect(() => {
        setMelody(prev =>
            prev && melodies.some(m => m.id === prev.id && m.available)
                ? prev
                : firstPlayableMelody(melodies),
        );
    }, [melodies]);


    const stepDone = useCallback((s: number) => {
        if (s === 1) return melody !== null;
        if (s === 3) return take !== null;
        return true;
    }, [melody, take]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * Getting to the comparison is the finish. Recorded once per melody, and it
     * lights the Mind Power ring the same way naming every section does.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 4 || !melody || !take) return;
        if (creditedRef.current === melody.id) return;
        creditedRef.current = melody.id;

        try {
            const key = 'mep-completed-melody-variations';
            const done: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (!done.includes(melody.id)) {
                done.push(melody.id);
                safeLocalStorageSetItem(key, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the take */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, melody, take]);

    const goNext = () => {
        if (!stepDone(step)) { nudge(); return; }
        clearNudge();
        // Leaving a step stops whatever it was playing — walking away from a
        // screen and still hearing it is the kind of thing that gets called a bug.
        setPlaying(null);
        setStep(s => Math.min(4, s + 1));
    };

    const goBack = () => {
        if (step === 1) { onBack(); return; }
        setPlaying(null);
        setStep(s => s - 1);
    };

    /** Another go at the same melody: the take goes, the task is re-dealt. */
    const startOver = () => {
        discard();
        setPlaying(null);
        setSendState('idle');
        creditedRef.current = null;
        setTaskIdx(Math.floor(Math.random() * VARIATION_TASKS.length));
        setStep(2);
    };

    const rerollTask = () => {
        if (VARIATION_TASKS.length < 2) return;
        haptic('tap');
        setTaskIdx(prev => {
            // Never the one already on screen — a re-roll that changes nothing
            // reads as a broken button.
            const others = VARIATION_TASKS.map((_, i) => i).filter(i => i !== prev);
            return others[Math.floor(Math.random() * others.length)];
        });
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || !take || !melody) return;
        setSendState('sending');
        const noteId = await createCanvasFromLines(user?.uid, {
            title: t('practice.mv_canvas_title').replace('{melody}', melody.title),
            // The task is what the take was answering, so it travels with it.
            lines: [t(task.labelKey)],
            sectionName: 'Verse 1',
            audio: {
                blob: take.blob,
                seconds: take.seconds,
                title: t('practice.mv_take_title').replace('{melody}', melody.title),
            },
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.mv_ask_choose'),
        2: t('practice.mv_ask_listen'),
        3: t('practice.mv_ask_record'),
        4: t('practice.mv_ask_compare'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.mv_nudge_choose'),
        3: t('practice.mv_nudge_record'),
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full"
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="flex min-w-0 select-none items-center justify-center gap-3">
                    <p className={`${ASK_SIZE} truncate font-sans font-semibold text-stone-700`}>
                        {ASKS[step]}
                    </p>
                    {melody && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {melody.title}
                        </span>
                    )}
                </div>

                {/* 1 — pick one */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-1 gap-3 duration-300 fade-in sm:grid-cols-2">
                        {playable.length === 0 && (
                            <p className="col-span-full py-10 text-center font-sans text-sm text-stone-500">
                                {t('practice.mv_no_melodies')}
                            </p>
                        )}
                        {playable.map(m => {
                            const picked = melody?.id === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => { setMelody(m); haptic('select'); }}
                                    className={`verse-card flex items-center gap-4 rounded-[20px] px-5 py-5 text-left ${picked ? 'is-linked' : ''}`}
                                >
                                    <Music4 className="h-5 w-5 shrink-0 text-stone-500" />
                                    <span className="min-w-0">
                                        <span className="block truncate font-serif text-[1.4rem] text-stone-800">
                                            {m.title}
                                        </span>
                                        <span className="block font-sans text-xs text-stone-500">
                                            {t(`practice.mv_instrument_${m.instrument}`)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2 — hear it, and read the one thing to change */}
                {step === 2 && melody && (
                    <div className="flex animate-in flex-col gap-4 duration-300 fade-in">
                        <MelodyClip
                            key={melody.audioUrl}
                            src={melody.audioUrl}
                            label={melody.title}
                            meta={t(`practice.mv_instrument_${melody.instrument}`)}
                            isPlaying={playing === 'original'}
                            onToggle={() => setPlaying(p => (p === 'original' ? null : 'original'))}
                        />
                        <div className="verse-card is-static flex flex-col gap-3 rounded-[20px] px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
                            <div className="min-w-0">
                                <p className="font-sans text-xs uppercase tracking-wide text-stone-400">
                                    {t('practice.mv_your_task')}
                                </p>
                                <p className="mt-1 font-serif text-[1.4rem] leading-tight text-stone-900">
                                    {t(task.labelKey)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={rerollTask}
                                aria-label={t('practice.mv_another_task')}
                                title={t('practice.mv_another_task')}
                                className={`${btn.icon('bare')} h-11 w-11 shrink-0 cursor-pointer`}
                            >
                                <Shuffle className="h-4 w-4 stroke-[2.2]" />
                            </button>
                        </div>
                    </div>
                )}

                {/* 3 — play your version in */}
                {step === 3 && melody && (
                    <div className="flex animate-in flex-col gap-4 duration-300 fade-in">
                        <div className="verse-card is-static rounded-[20px] px-6 py-4 md:px-8">
                            <p className="font-sans text-xs uppercase tracking-wide text-stone-400">
                                {t('practice.mv_your_task')}
                            </p>
                            <p className="mt-1 font-serif text-[1.2rem] text-stone-900">{t(task.labelKey)}</p>
                        </div>

                        <div className="verse-card is-static flex flex-col items-center gap-4 rounded-[20px] px-6 py-10">
                            <button
                                type="button"
                                onClick={() => {
                                    haptic('impact');
                                    if (isRecording) { stop(); return; }
                                    // Recording over the top of playback would
                                    // capture the melody along with the answer.
                                    setPlaying(null);
                                    start();
                                }}
                                className={`${isRecording ? btn.danger('bare') : btn.primary('bare')} h-20 w-20 cursor-pointer rounded-full`}
                                aria-label={isRecording ? t('practice.mv_stop') : t('practice.mv_record')}
                            >
                                {isRecording
                                    ? <Square className="h-6 w-6 fill-current stroke-none" />
                                    : <Mic className="h-7 w-7 stroke-[2]" />}
                            </button>
                            <p className="font-sans text-sm tabular-nums text-stone-500">
                                {isRecording
                                    ? `${fmt(seconds)} · ${t('practice.mv_stop_hint')}`
                                    : t(take ? 'practice.mv_record_again_hint' : 'practice.mv_record_hint')}
                            </p>
                            {micError && (
                                <p role="alert" style={{ color: WRONG_TEXT }} className="max-w-md text-center font-sans text-xs">
                                    {t(`practice.mv_mic_${micError}`)}
                                </p>
                            )}
                        </div>

                        {take && !isRecording && (
                            <MelodyClip
                                key={take.url}
                                src={take.url}
                                label={t('practice.mv_your_take')}
                                meta={fmt(take.seconds)}
                                knownSeconds={take.seconds}
                                tone="take"
                                isPlaying={playing === 'take'}
                                onToggle={() => setPlaying(p => (p === 'take' ? null : 'take'))}
                            />
                        )}
                    </div>
                )}

                {/* 4 — one against the other */}
                {step === 4 && melody && take && (
                    <div className="flex animate-in flex-col gap-3 duration-300 fade-in">
                        <MelodyClip
                            key={melody.audioUrl}
                            src={melody.audioUrl}
                            label={t('practice.mv_the_original')}
                            meta={melody.title}
                            isPlaying={playing === 'original'}
                            onToggle={() => setPlaying(p => (p === 'original' ? null : 'original'))}
                        />
                        <MelodyClip
                            key={take.url}
                            src={take.url}
                            label={t('practice.mv_your_take')}
                            meta={t(task.labelKey)}
                            knownSeconds={take.seconds}
                            tone="take"
                            isPlaying={playing === 'take'}
                            onToggle={() => setPlaying(p => (p === 'take' ? null : 'take'))}
                        />
                    </div>
                )}

                {/* The way through */}
                {step === 4 ? (
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                        <button
                            type="button"
                            onClick={goBack}
                            aria-label={t('practice.previous_step')}
                            title={t('practice.previous_step')}
                            className={`${btn.icon('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer`}
                        >
                            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={startOver}
                            aria-label={t('practice.mv_try_another')}
                            title={t('practice.mv_try_another')}
                            className={`${btn.secondary('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer`}
                        >
                            <RotateCcw className="h-5 w-5 stroke-[2.5]" />
                        </button>
                        <div className="relative flex flex-col items-start">
                            <span className="pointer-events-none absolute inset-0 isolate z-20">
                                <Confetti colors={BURST_ON_GREEN} />
                            </span>
                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={sendState === 'sending'}
                                className={`${btn.primary('bare')} ${ACTION_SIZE} cursor-pointer whitespace-nowrap`}
                            >
                                {sendState === 'sending' && (
                                    <Loader2 className="h-5 w-5 animate-spin stroke-[2.5]" />
                                )}
                                {t('practice.send_to_canvas')}
                            </button>
                            {sendState === 'failed' && (
                                <span
                                    role="alert"
                                    style={{ color: WRONG_TEXT }}
                                    className="absolute left-1 top-full mt-2 whitespace-nowrap font-sans text-xs"
                                >
                                    {t('practice.send_to_canvas_failed')}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <div className="flex flex-1 justify-end">
                            <button
                                type="button"
                                onClick={goBack}
                                aria-label={t('practice.previous_step')}
                                title={t('practice.previous_step')}
                                className={`${btn.icon('bare')} ${ACTION_H} w-14 shrink-0 cursor-pointer`}
                            >
                                <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
                            </button>
                        </div>
                        <div
                            className="flex shrink-0 items-center gap-1.5"
                            aria-label={`${t('practice.step')} ${step} ${t('practice.of')} ${STEPS.length}`}
                        >
                            {STEPS.map(n => (
                                <span
                                    key={n}
                                    className="h-1.5 w-1.5 rounded-full transition-colors"
                                    style={{ backgroundColor: n <= step ? '#1C1917' : TAG_BG }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-1 justify-start">
                            <button
                                // Never disabled — pressing it early shakes it and says
                                // what is missing, as everywhere else in Practice.
                                key={shakeKey}
                                type="button"
                                onClick={goNext}
                                className={`${btn.primary('bare')} ${ACTION_SIZE} ${shakeClass} cursor-pointer`}
                            >
                                {t('common.next')}
                                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                            </button>
                        </div>
                    </div>
                )}

                <NudgeMessage count={nudgeCount}>{NUDGES[step]}</NudgeMessage>
            </div>
        </motion.div>
    );
}
