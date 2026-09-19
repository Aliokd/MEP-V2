"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Dices, Eraser, Loader2, Play, Repeat, RotateCcw, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/lib/haptics';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import {
    KITS, STEPS, TEMPOS, playRhythm, renderRhythmWav, soundHit, stepSeconds,
    type Kit, type RhythmHit, type TempoId, type Voice,
} from '../lib/rhythmSynth';
import { dealBeat, type BeatCells } from '../lib/dealBeat';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import RhythmGrid from './RhythmGrid';

/*
 * Practice 12 — Build a beat.
 *
 * Rhythm's grid with the whole kit on it: hat, snare, kick, clap and tom,
 * five rows of sixteen. Choose a kit first — the same five drums as an
 * acoustic set or as a drum machine, heard by tapping the card — then build
 * a bar, or have one dealt and change it, and hear it go round. Then hear
 * the whole thing and send it to the canvas, where it lands as an audio
 * card rendered by the same code that played it.
 *
 * Deliberately small. The reference this grew from had a tempo dial, a time
 * signature, a bar count, a kit menu, six drums, clear and random. Here the
 * kit is one of two, the tempo one of three, the bar is one bar of four,
 * and the drums are the five that make a beat. Random is not noise: it deals
 * a bar with the kick and snare where a beat keeps them, so what it hands
 * over is worth changing — see dealBeat.
 */

/** Shared with the other practices so the twelve are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEP_LIST = [1, 2, 3] as const;
/** Fewer than this is a tap, not a beat. */
const MIN_HITS = 4;
/** Top to bottom, as on a drum sheet: cymbals, snare, kick, then the extras. */
const VOICES: Voice[] = ['high', 'mid', 'low', 'clap', 'tom'];
/** What a kit sounds like, played when its card is tapped: one plain bar. */
const PREVIEW: RhythmHit[] = [
    { step: 0, voice: 'low' }, { step: 2, voice: 'high' }, { step: 4, voice: 'mid' }, { step: 6, voice: 'high' },
    { step: 8, voice: 'low' }, { step: 10, voice: 'high' }, { step: 12, voice: 'mid' }, { step: 12, voice: 'clap' },
    { step: 14, voice: 'high' }, { step: 15, voice: 'tom' },
];

const emptyGrid = (): BeatCells => ({
    high: Array.from({ length: STEPS }, () => false),
    mid: Array.from({ length: STEPS }, () => false),
    low: Array.from({ length: STEPS }, () => false),
    clap: Array.from({ length: STEPS }, () => false),
    tom: Array.from({ length: STEPS }, () => false),
});

interface BeatBuilderProps {
    onBack: () => void;
}

export default function BeatBuilder({ onBack }: BeatBuilderProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [kit, setKit] = useState<Kit | null>(null);
    /** Medium unless changed: the kit is the question on the first step, the tempo a default. */
    const [tempo, setTempo] = useState<TempoId>('medium');
    const [grid, setGrid] = useState<BeatCells>(emptyGrid);
    /** How many bars Random has dealt: the seed of the next one. */
    const [deals, setDeals] = useState(0);
    const [playingStep, setPlayingStep] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    /** The rendered file, made once the bar is final so Continue is instant.
     *  Carries the id of the bar it was rendered from, so a take from an
     *  earlier bar is never mistaken for the current one. */
    const [take, setTake] = useState<{ id: string; blob: Blob; seconds: number } | null>(null);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const bpm = TEMPOS.find(x => x.id === tempo)?.bpm ?? 100;
    const hits: RhythmHit[] = VOICES.flatMap(voice =>
        grid[voice].flatMap((on, s) => (on ? [{ step: s, voice }] : [])));
    const placed = hits.length;

    /*
     * Playback: the audio for a whole bar is scheduled at once on the audio
     * clock, which is what keeps sixteen hits in time. Timeouts only move the
     * highlight, and read what they need through refs so a callback scheduled
     * a bar ago sees things as they are now.
     */
    const loopRef = useRef(loop);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    const hitsRef = useRef(hits);
    const bpmRef = useRef(bpm);
    const kitRef = useRef<Kit>('acoustic');
    useEffect(() => { hitsRef.current = hits; bpmRef.current = bpm; kitRef.current = kit ?? 'acoustic'; });
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
    /** One bar: every hit on the clock at once, the highlight on the timer. */
    const startBar = () => {
        releaseRef.current?.();
        releaseRef.current = playRhythm(hitsRef.current, bpmRef.current, kitRef.current);
        stepRef.current(0);
    };
    useEffect(() => { stepRef.current = runStep; startBarRef.current = startBar; });

    const togglePlayback = () => {
        haptic('tap');
        if (playingStep !== null) { stopPlayback(); return; }
        startBar();
    };

    // Leaving the practice must not leave the bar looping. Leaving a step is
    // handled where the step changes, not in an effect.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingStep !== null;

    const stepDone = useCallback((s: number) => {
        if (s === 1) return kit !== null;
        if (s === 2) return placed >= MIN_HITS;
        return true;
    }, [kit, placed]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * The file is rendered as soon as the bar is final rather than when
     * Continue is pressed: it takes a moment, better spent while the
     * songwriter is listening back than after they have decided to leave.
     */
    const bits = (voice: Voice) => grid[voice].map(on => (on ? '1' : '0')).join('');
    const barId = kit ? `${kit}:${tempo}:${VOICES.map(bits).join('|')}` : '';
    useEffect(() => {
        if (step !== 3 || !kit) return;
        let live = true;
        const id = barId;
        renderRhythmWav(hitsRef.current, bpmRef.current, 2, kit).then(rendered => { if (live) setTake({ id, ...rendered }); });
        return () => { live = false; };
    }, [step, kit, barId]);
    /** The take for this very bar, or nothing yet. */
    const ready = take && take.id === barId ? take : null;

    /*
     * Reaching your beat is the finish. Recorded once per kit, tempo and bar,
     * and it lights the Mind Power ring the same way the others do.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !kit) return;
        if (creditedRef.current === barId) return;
        creditedRef.current = barId;

        try {
            const storageKey = 'mep-completed-beats';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(barId)) {
                done.push(barId);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the beat */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, kit, barId]);

    /** A kit, heard as it is chosen. The bar stays: a beat is the same beat on any drums. */
    const chooseKit = (id: Kit) => {
        haptic('select');
        stopPlayback();
        setKit(id);
        releaseRef.current = playRhythm(PREVIEW, bpm, id);
    };

    /** A tempo. The hits stay: a rhythm is the same rhythm at any speed. */
    const chooseTempo = (id: TempoId) => {
        haptic('select');
        stopPlayback();
        setTempo(id);
    };

    /** A square: tap to put a hit there, tap again to clear it. */
    const toggle = (voice: Voice, s: number) => {
        haptic('select');
        const next: BeatCells = {
            high: [...grid.high], mid: [...grid.mid], low: [...grid.low], clap: [...grid.clap], tom: [...grid.tom],
        };
        next[voice][s] = !next[voice][s];
        if (next[voice][s] && !isPlaying) soundHit(voice, kit ?? 'acoustic');
        setGrid(next);
    };

    /** Every square off. Playback carries on: the next bar round is silent. */
    const clearAll = () => {
        haptic('tap');
        setGrid(emptyGrid());
    };

    /** The next bar from the dealer. Deterministic in the count, so no chance runs during a render. */
    const dealRandom = () => {
        haptic('select');
        const n = deals + 1;
        setDeals(n);
        setGrid(dealBeat(n));
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

    /** Another bar on the same kit at the same tempo. */
    const startOver = () => {
        stopPlayback();
        setGrid(emptyGrid());
        setTake(null);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || !kit) return;
        setSendState('sending');
        // Normally ready long before this is pressed; rendered here only if not.
        const rendered = ready ?? await renderRhythmWav(hits, bpm, 2, kit);
        const title = t(`practice.bb_canvas_title_${kit}`).replace('{bpm}', String(bpm));
        const noteId = await createCanvasFromLines(user?.uid, {
            title,
            lines: [],
            audio: { blob: rendered.blob, seconds: rendered.seconds, title },
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.bb_ask_kit'),
        2: t('practice.bb_ask_build'),
        3: t('practice.bb_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.bb_nudge_kit'),
        2: t('practice.bb_nudge_hits'),
    };
    const kitLabel = (id: Kit) => t(`practice.bb_kit_${id}`);
    /** The drums by name, rather than the two-row practice's High and Low. */
    const LABELS: Record<Voice, string> = {
        high: t('practice.bb_hat'),
        mid: t('practice.bb_snare'),
        low: t('practice.bb_kick'),
        clap: t('practice.bb_clap'),
        tom: t('practice.bb_tom'),
    };

    /** Play/stop and loop, the same on the building step and the finished one. */
    const transport = (extra?: boolean) => (
        <div className="flex flex-wrap items-center justify-center gap-3">
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
            {extra && (
                <>
                    <button
                        type="button"
                        data-bb-clear
                        onClick={clearAll}
                        className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer`}
                    >
                        <Eraser className="h-4 w-4 stroke-[2.2]" />
                        {t('practice.bb_clear')}
                    </button>
                    <button
                        type="button"
                        data-bb-random
                        onClick={dealRandom}
                        className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer`}
                    >
                        <Dices className="h-4 w-4 stroke-[2.2]" />
                        {t('practice.bb_random')}
                    </button>
                </>
            )}
        </div>
    );

    /** The grid, shared with Rhythm and Developing a rhythm — see RhythmGrid. */
    const gridView = (interactive: boolean) => (
        <RhythmGrid
            voices={VOICES}
            grid={grid}
            labels={LABELS}
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
                    {kit && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {kitLabel(kit)} · {t('practice.rb_bpm').replace('{n}', String(bpm))}
                        </span>
                    )}
                </div>

                {/* 1 — pick a kit, heard on the tap; the tempo sits beneath, medium unless changed */}
                {step === 1 && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {KITS.map(x => {
                                const picked = kit === x.id;
                                return (
                                    <button
                                        key={x.id}
                                        type="button"
                                        data-bb-kit={x.id}
                                        onClick={() => chooseKit(x.id)}
                                        className={`verse-card flex flex-col items-start gap-1 rounded-[20px] px-5 py-5 text-left ${picked ? 'is-linked' : ''}`}
                                    >
                                        <span className="font-serif text-[1.6rem] leading-tight text-stone-800">
                                            {kitLabel(x.id)}
                                        </span>
                                        <span className="font-sans text-xs text-stone-500">
                                            {t(`practice.bb_kit_${x.id}_desc`)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="mr-1 font-sans text-xs text-stone-500">{t('practice.bb_tempo')}</span>
                            {TEMPOS.map(x => {
                                const picked = tempo === x.id;
                                return (
                                    <button
                                        key={x.id}
                                        type="button"
                                        data-bb-tempo={x.id}
                                        aria-pressed={picked}
                                        onClick={() => chooseTempo(x.id)}
                                        className={`${btn.secondary('bare')} h-10 gap-1.5 px-4 text-sm font-semibold cursor-pointer ${picked ? 'ring-2 ring-stone-900/60' : ''}`}
                                    >
                                        {t(`practice.rb_tempo_${x.id}`)}
                                        <span className="font-normal text-stone-500">{t('practice.rb_bpm').replace('{n}', String(x.bpm))}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.bb_hint_kit')}</p>
                    </div>
                )}

                {/* 2 — build. A square sounds as it is placed; play runs the bar;
                    Random deals one worth changing, Clear starts from nothing. */}
                {step === 2 && kit && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {gridView(true)}
                        {transport(true)}
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.bb_hint_build')}</p>
                    </div>
                )}

                {/* 3 — your beat, on its way to the canvas as a recording */}
                {step === 3 && kit && (
                    <div
                        className="flex animate-in flex-col gap-5 duration-300 fade-in"
                        data-bb-take-seconds={ready?.seconds ?? ''}
                        data-bb-take-bytes={ready?.blob.size ?? ''}
                    >
                        {gridView(false)}
                        {transport()}
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
                            aria-label={t('practice.bb_try_another')}
                            title={t('practice.bb_try_another')}
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
