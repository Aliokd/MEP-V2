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
import { chordPitches, chordPositions } from '@/lib/chords';
import { strum } from '@/app/platform/create/components/chordVisuals';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import {
    BAR_COUNT, PRACTICE_KEYS, keyTriads, knownProgression, numeralOf, type PracticeKey,
} from '../data/progressions';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';

/*
 * Practice 4 — chord progressions.
 *
 * Pick a key, fill four bars from the chords that live in it, and hear the loop
 * go round. Then see what you built written the way songwriters write it — in
 * Roman numerals — and, when it is one of the progressions everybody knows,
 * its name. No right answer: the exercise is hearing what four chords do to
 * each other, and the numerals are there so the lesson travels to other keys.
 *
 * Nothing is fetched or recorded. The chords come from theory (lib/chords) and
 * the sound from the canvas's own strum synth, so this is the one practice with
 * no content to author.
 */

/** Shared with the other practices so the four are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3] as const;
/** One bar at a walking tempo. Long enough to hear a chord settle before the next. */
const BAR_SECONDS = 1.5;
/** The playing bar's card, the take-cream the other practices use for "yours, live". */
const LIVE_BG = '#FBFFED';

type Bars = (string | null)[];
const emptyBars = (): Bars => Array.from({ length: BAR_COUNT }, () => null);

interface ChordProgressionProps {
    onBack: () => void;
}

export default function ChordProgression({ onBack }: ChordProgressionProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [key, setKey] = useState<PracticeKey | null>(null);
    const [bars, setBars] = useState<Bars>(emptyBars);
    /** The bar the next chip fills. */
    const [activeBar, setActiveBar] = useState(0);
    const [playingBar, setPlayingBar] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const triads = key ? keyTriads(key) : [];
    const numerals = key ? bars.map(c => (c ? numeralOf(key, c) : null)) : bars.map(() => null);
    const knownKey = knownProgression(numerals);

    /*
     * Playback runs on timeouts, one per bar, and every timeout reads the bars
     * and loop flag through refs. State would be stale inside a callback
     * scheduled a bar and a half ago; a ref is always now.
     */
    const barsRef = useRef(bars);
    const loopRef = useRef(loop);
    useEffect(() => { barsRef.current = bars; }, [bars]);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    const timerRef = useRef<number | null>(null);
    const ringRef = useRef<(() => void) | null>(null);

    const stopPlayback = useCallback(() => {
        if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        ringRef.current?.();
        ringRef.current = null;
        setPlayingBar(null);
    }, []);

    /** Sound one chord. The previous one is let go first, so bars never pile up. */
    const sound = useCallback((symbol: string) => {
        ringRef.current?.();
        const position = chordPositions(symbol)[0];
        ringRef.current = position ? strum(chordPitches(position)) : null;
    }, []);

    /* The loop reschedules itself through a ref rather than by name — a
       useCallback cannot reference itself, and the ref also means a new
       identity never orphans a timeout that is already queued. */
    const playFromRef = useRef<(i: number) => void>(() => {});
    const playFrom = useCallback((i: number) => {
        const symbol = barsRef.current[i];
        if (symbol) sound(symbol);
        setPlayingBar(i);
        timerRef.current = window.setTimeout(() => {
            const next = i + 1;
            if (next < BAR_COUNT) playFromRef.current(next);
            else if (loopRef.current) playFromRef.current(0);
            else stopPlayback();
        }, BAR_SECONDS * 1000);
    }, [sound, stopPlayback]);
    useEffect(() => { playFromRef.current = playFrom; }, [playFrom]);

    const togglePlayback = () => {
        haptic('tap');
        if (playingBar !== null) { stopPlayback(); return; }
        playFrom(0);
    };

    // Leaving the practice must not leave four bars looping. Leaving a step is
    // handled where the step changes (goNext, goBack, startOver) rather than in
    // an effect: stopping is a state change, and a state change inside an
    // effect is a second render for nothing.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingBar !== null;
    const barsFilled = bars.every(Boolean);

    const stepDone = useCallback((s: number) => {
        if (s === 1) return key !== null;
        if (s === 2) return barsFilled;
        return true;
    }, [key, barsFilled]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * Reaching your progression is the finish. Recorded once per key and
     * pattern, and it lights the Mind Power ring the same way the others do.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !key || !barsFilled) return;
        const id = `${key.id}:${bars.join(' ')}`;
        if (creditedRef.current === id) return;
        creditedRef.current = id;

        try {
            const storageKey = 'mep-completed-chord-progressions';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(id)) {
                done.push(id);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the progression */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, key, bars, barsFilled]);

    const chooseKey = (k: PracticeKey) => {
        haptic('select');
        stopPlayback();
        setKey(k);
        // A new key means new chords; the old bars would be in the wrong key.
        if (k.id !== key?.id) { setBars(emptyBars()); setActiveBar(0); }
    };

    /** Put a chord in the active bar, sound it, and move on to the next empty bar. */
    const fill = (symbol: string) => {
        haptic('select');
        if (!isPlaying) sound(symbol);
        const next = [...bars];
        next[activeBar] = symbol;
        setBars(next);
        const following = next.findIndex((c, i) => i > activeBar && !c);
        const first = next.findIndex(c => !c);
        setActiveBar(following !== -1 ? following : first !== -1 ? first : activeBar);
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

    /** Another go: same key, empty bars. */
    const startOver = () => {
        stopPlayback();
        setBars(emptyBars());
        setActiveBar(0);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || !key || !barsFilled) return;
        setSendState('sending');
        const noteId = await createCanvasFromLines(user?.uid, {
            title: t('practice.cp_canvas_title').replace('{key}', keyLabel(key)),
            lines: [],
            // The four chords go over as chord cards, in order, so the canvas
            // opens on the progression itself rather than on a line naming it.
            chords: bars.filter((c): c is string => c !== null),
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const keyLabel = (k: PracticeKey) =>
        `${k.tonic} ${t(k.mode === 'major' ? 'practice.cp_major' : 'practice.cp_minor')}`;

    const ASKS: Record<number, string> = {
        1: t('practice.cp_ask_key'),
        2: t('practice.cp_ask_build'),
        3: t('practice.cp_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.cp_nudge_key'),
        2: t('practice.cp_nudge_bars'),
    };

    /** Play/stop and loop, the same on the build step and the finished one. */
    const transport = (
        <div className="flex items-center justify-center gap-3">
            <button
                type="button"
                data-cp-play
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
                data-cp-loop
                aria-pressed={loop}
                onClick={() => { haptic('tap'); setLoop(l => !l); }}
                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer ${loop ? 'ring-2 ring-stone-900/60' : ''}`}
            >
                <Repeat className="h-4 w-4 stroke-[2.4]" />
                {t('practice.cp_loop')}
            </button>
        </div>
    );

    /** The four bars. Interactive on the build step, a plain reading on the last. */
    const barRow = (interactive: boolean) => (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bars.map((chord, i) => {
                const active = interactive && activeBar === i;
                const live = playingBar === i;
                const inner = (
                    <>
                        <span className="font-sans text-xs uppercase tracking-wide text-stone-400">
                            {t('practice.cp_bar').replace('{n}', String(i + 1))}
                        </span>
                        <span className={`mt-1 font-serif text-[2.2rem] leading-none ${chord ? 'text-stone-900' : 'text-stone-300'}`}>
                            {chord ?? '·'}
                        </span>
                        <span className="mt-2 h-4 font-sans text-sm text-stone-500">{numerals[i] ?? ''}</span>
                    </>
                );
                const cls = `verse-card flex flex-col items-center justify-center rounded-[20px] px-3 py-5 text-center ${active ? 'is-linked' : ''} ${interactive ? '' : 'is-static'}`;
                return interactive ? (
                    <button
                        key={i}
                        type="button"
                        data-cp-bar={i}
                        onClick={() => { haptic('tap'); setActiveBar(i); }}
                        className={`${cls} cursor-pointer`}
                        style={live ? { backgroundColor: LIVE_BG } : undefined}
                    >
                        {inner}
                    </button>
                ) : (
                    <div key={i} data-cp-bar={i} className={cls} style={live ? { backgroundColor: LIVE_BG } : undefined}>
                        {inner}
                    </div>
                );
            })}
        </div>
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
                    {key && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {keyLabel(key)}
                        </span>
                    )}
                </div>

                {/* 1 — pick a key. Each card shows the chords that come with it,
                    so the choice is made on what you will have to play with. */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-2 gap-3 duration-300 fade-in sm:grid-cols-3">
                        {PRACTICE_KEYS.map(k => {
                            const picked = key?.id === k.id;
                            return (
                                <button
                                    key={k.id}
                                    type="button"
                                    data-cp-key={k.id}
                                    onClick={() => chooseKey(k)}
                                    className={`verse-card flex flex-col items-start gap-1 rounded-[20px] px-5 py-5 text-left ${picked ? 'is-linked' : ''}`}
                                >
                                    <span className="font-serif text-[1.6rem] leading-tight text-stone-800">
                                        {keyLabel(k)}
                                    </span>
                                    <span className="font-sans text-xs text-stone-500">
                                        {keyTriads(k).join(' · ')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2 — fill the bars. Tap a bar, then a chord; the chord sounds as
                    it lands and the next empty bar takes the cursor. */}
                {step === 2 && key && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {barRow(true)}

                        <div className="flex flex-wrap justify-center gap-2">
                            {triads.map(symbol => (
                                <button
                                    key={symbol}
                                    type="button"
                                    data-cp-chip={symbol}
                                    onClick={() => fill(symbol)}
                                    className={`${btn.primary('bare')} h-11 min-w-[3.5rem] px-4 font-serif text-lg cursor-pointer`}
                                >
                                    {symbol}
                                </button>
                            ))}
                        </div>

                        {transport}
                    </div>
                )}

                {/* 3 — your progression, named where it has a name */}
                {step === 3 && key && barsFilled && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {barRow(false)}
                        <p className="text-center font-sans text-sm text-stone-500">
                            <span className="font-semibold text-stone-700">{numerals.join(' – ')}</span>
                            {knownKey && <> · {t(knownKey)}</>}
                        </p>
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
                            aria-label={t('practice.cp_try_another')}
                            title={t('practice.cp_try_another')}
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
