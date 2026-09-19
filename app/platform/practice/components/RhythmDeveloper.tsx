"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Play, Repeat, RotateCcw, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/lib/haptics';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import { RHYTHM_FEELS, type RhythmFeel } from '../data/rhythmFeels';
import {
    STEPS, playRhythm, renderRhythmWav, soundHit, stepSeconds, type CoreVoice, type RhythmHit, type Voice,
} from '../lib/rhythmSynth';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import RhythmGrid from './RhythmGrid';

/*
 * Practice 9 — Developing a rhythm.
 *
 * A feel is given — a bar everyone recognises, at the tempo it lives at —
 * and the exercise is what you do to it: add a hit, take one away, move the
 * kick, until it moves the way you want. Three voices rather than Rhythm's
 * two, because a snare is what makes a groove a groove. Then hear it, and
 * send it to the canvas as an audio card, rendered by the same code that
 * played it.
 *
 * Deliberately small. The reference this grew from had a time signature, a
 * tempo, a sound menu, note values, four bars and a preset row. Here the
 * feel carries its own tempo, the bar is one bar of four, and the presets
 * are the first step.
 */

/** Shared with the other practices so the nine are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEP_LIST = [1, 2, 3] as const;
/** Fewer changes than this is a listen, not a development. */
const MIN_CHANGES = 3;
/** High on top, low beneath: hats, snare, kick, as on any drum sheet. */
const VOICES: CoreVoice[] = ['high', 'mid', 'low'];

/** The three rows this practice draws. Build a beat's clap and tom are not here. */
type RhythmCells = Record<CoreVoice, boolean[]>;

const cellsFor = (feel: RhythmFeel | null): RhythmCells => ({
    high: Array.from({ length: STEPS }, (_, s) => !!feel?.hits.high.includes(s)),
    mid: Array.from({ length: STEPS }, (_, s) => !!feel?.hits.mid.includes(s)),
    low: Array.from({ length: STEPS }, (_, s) => !!feel?.hits.low.includes(s)),
});

interface RhythmDeveloperProps {
    onBack: () => void;
}

export default function RhythmDeveloper({ onBack }: RhythmDeveloperProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [feel, setFeel] = useState<RhythmFeel | null>(null);
    const [grid, setGrid] = useState<RhythmCells>(() => cellsFor(null));
    const [playingStep, setPlayingStep] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    /** The rendered file, made once the bar is final so Continue is instant.
     *  Carries the id of the bar it was rendered from, so a take from an
     *  earlier bar is never mistaken for the current one. */
    const [take, setTake] = useState<{ id: string; blob: Blob; seconds: number } | null>(null);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const bpm = feel?.bpm ?? 100;
    const given = cellsFor(feel);
    const hits: RhythmHit[] = VOICES.flatMap(voice =>
        grid[voice].flatMap((on, s) => (on ? [{ step: s, voice }] : [])));
    /** Every square that differs from the feel as given, added or taken away. */
    const changes = VOICES.reduce((n, voice) =>
        n + grid[voice].filter((on, s) => on !== given[voice][s]).length, 0);

    /*
     * Playback: the audio for a whole bar is scheduled at once on the audio
     * clock; timeouts only move the highlight, and read what they need
     * through refs so a callback scheduled a bar ago sees things as now.
     */
    const loopRef = useRef(loop);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    const hitsRef = useRef(hits);
    const bpmRef = useRef(bpm);
    useEffect(() => { hitsRef.current = hits; bpmRef.current = bpm; });
    const timerRef = useRef<number | null>(null);
    const releaseRef = useRef<(() => void) | null>(null);

    const stopPlayback = useCallback(() => {
        if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        releaseRef.current?.();
        releaseRef.current = null;
        setPlayingStep(null);
    }, []);

    /* The step timer and the bar each reschedule themselves through a ref
       rather than by name, so a timeout queued a step ago always reaches the
       current function. Neither is memoized: they are only ever called from
       these refs or from a press, and the refs are re-pointed after every
       render. */
    const startBarRef = useRef<() => void>(() => {});
    const stepRef = useRef<(s: number) => void>(() => {});
    const runStep = (s: number) => {
        setPlayingStep(s);
        timerRef.current = window.setTimeout(() => {
            const next = s + 1;
            if (next < STEPS) stepRef.current(next);
            else if (loopRef.current) startBarRef.current();
            else stopPlayback();
        }, stepSeconds(bpmRef.current) * 1000);
    };
    const startBar = () => {
        releaseRef.current?.();
        releaseRef.current = playRhythm(hitsRef.current, bpmRef.current);
        stepRef.current(0);
    };
    useEffect(() => { stepRef.current = runStep; startBarRef.current = startBar; });

    const togglePlayback = () => {
        haptic('tap');
        if (playingStep !== null) { stopPlayback(); return; }
        startBar();
    };

    // Leaving the practice must not leave the bar looping.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingStep !== null;

    const stepDone = useCallback((s: number) => {
        if (s === 1) return feel !== null;
        if (s === 2) return changes >= MIN_CHANGES;
        return true;
    }, [feel, changes]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    // Rendered as soon as the bar is final, so Continue is instant.
    const bits = (voice: CoreVoice) => grid[voice].map(on => (on ? '1' : '0')).join('');
    const barId = feel ? `${feel.id}:${bits('high')}|${bits('mid')}|${bits('low')}` : '';
    useEffect(() => {
        if (step !== 3 || !feel) return;
        let live = true;
        const id = barId;
        renderRhythmWav(hitsRef.current, bpmRef.current).then(rendered => { if (live) setTake({ id, ...rendered }); });
        return () => { live = false; };
    }, [step, feel, barId]);
    const ready = take && take.id === barId ? take : null;

    /*
     * Reaching your rhythm is the finish. Recorded once per feel and bar,
     * and it lights the Mind Power ring the same way the others do.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !feel) return;
        if (creditedRef.current === barId) return;
        creditedRef.current = barId;

        try {
            const storageKey = 'mep-completed-rhythm-developments';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(barId)) {
                done.push(barId);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the rhythm */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, feel, barId]);

    /** A feel: the bar is dealt fresh from it. */
    const chooseFeel = (f: RhythmFeel) => {
        haptic('select');
        stopPlayback();
        setFeel(f);
        if (f.id !== feel?.id) setGrid(cellsFor(f));
    };

    /** A square: tap to put a hit there, tap again to clear it — given or not. */
    const toggle = (voice: Voice, s: number) => {
        if (!(voice in grid)) return;
        haptic('select');
        const next: RhythmCells = { high: [...grid.high], mid: [...grid.mid], low: [...grid.low] };
        const row = next[voice as CoreVoice];
        row[s] = !row[s];
        if (row[s] && !isPlaying) soundHit(voice);
        setGrid(next);
    };

    const goNext = () => {
        if (!stepDone(step)) { nudge(); return; }
        clearNudge();
        stopPlayback();
        setStep(s => Math.min(3, s + 1));
    };

    const goBack = () => {
        if (step === 1) { onBack(); return; }
        stopPlayback();
        setStep(s => s - 1);
    };

    /** The same feel, back to how it was given. */
    const startOver = () => {
        stopPlayback();
        setGrid(cellsFor(feel));
        setTake(null);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || !feel) return;
        setSendState('sending');
        const rendered = ready ?? await renderRhythmWav(hits, bpm);
        const title = t('practice.rb_canvas_title').replace('{bpm}', String(bpm));
        const noteId = await createCanvasFromLines(user?.uid, {
            title,
            lines: [],
            audio: { blob: rendered.blob, seconds: rendered.seconds, title },
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.dr_ask_feel'),
        2: t('practice.dr_ask_develop'),
        3: t('practice.rb_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.dr_nudge_feel'),
        2: t('practice.dr_nudge_change'),
    };
    const feelLabel = (f: RhythmFeel) => t(`practice.dr_feel_${f.id}`);

    /** Play/stop and loop, the same on the developing step and the finished one. */
    const transport = (
        <div className="flex items-center justify-center gap-3">
            <button
                type="button"
                data-rb-play
                onClick={togglePlayback}
                className={`${isPlaying ? btn.secondary('bare') : btn.primary('bare')} h-12 gap-2.5 px-6 text-base font-semibold cursor-pointer`}
            >
                {isPlaying
                    ? <Square className="h-4 w-4 fill-current stroke-none" />
                    : <Play className="h-4 w-4 translate-x-[1px] fill-current stroke-none" />}
                {isPlaying ? t('practice.cp_stop') : t('practice.cp_play')}
            </button>
            <button
                type="button"
                data-rb-loop
                aria-pressed={loop}
                onClick={() => { haptic('tap'); setLoop(l => !l); }}
                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer ${loop ? 'ring-2 ring-stone-900/60' : ''}`}
            >
                <Repeat className="h-4 w-4 stroke-[2.4]" />
                {t('practice.cp_loop')}
            </button>
        </div>
    );

    /** The given hits stay purple as long as they stand; yours are green. */
    const gridView = (interactive: boolean) => (
        <RhythmGrid
            voices={VOICES}
            grid={grid}
            given={(voice, s) => voice in given && given[voice as CoreVoice][s]}
            playingStep={playingStep}
            interactive={interactive}
            onToggle={toggle}
        />
    );

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
                    {feel && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {feelLabel(feel)} · {t('practice.rb_bpm').replace('{n}', String(bpm))}
                        </span>
                    )}
                </div>

                {/* 1 — pick a feel. Each card carries the tempo it lives at. */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-2 gap-3 duration-300 fade-in sm:grid-cols-3">
                        {RHYTHM_FEELS.map(f => {
                            const picked = feel?.id === f.id;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    data-dr-feel={f.id}
                                    onClick={() => chooseFeel(f)}
                                    className={`verse-card flex flex-col items-start gap-1 rounded-[20px] px-5 py-5 text-left ${picked ? 'is-linked' : ''}`}
                                >
                                    <span className="font-serif text-[1.6rem] leading-tight text-stone-800">
                                        {feelLabel(f)}
                                    </span>
                                    <span className="font-sans text-xs text-stone-500">
                                        {t('practice.rb_bpm').replace('{n}', String(f.bpm))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2 — develop. The feel is in purple; what you add is green. */}
                {step === 2 && feel && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {gridView(true)}
                        {transport}
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.dr_given_hint')}</p>
                    </div>
                )}

                {/* 3 — your rhythm, on its way to the canvas as a recording */}
                {step === 3 && feel && (
                    <div
                        className="flex animate-in flex-col gap-5 duration-300 fade-in"
                        data-rb-take-seconds={ready?.seconds ?? ''}
                        data-rb-take-bytes={ready?.blob.size ?? ''}
                    >
                        {gridView(false)}
                        {transport}
                    </div>
                )}

                {/* The way through */}
                {step === 3 ? (
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
                            aria-label={t('practice.rb_try_another')}
                            title={t('practice.rb_try_another')}
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
                            aria-label={`${t('practice.step')} ${step} ${t('practice.of')} ${STEP_LIST.length}`}
                        >
                            {STEP_LIST.map(n => (
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
