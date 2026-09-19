"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Play, Repeat, RotateCcw, Shuffle, Square } from 'lucide-react';
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
import { PRACTICE_KEYS, type PracticeKey } from '../data/keys';
import { keyTriads } from '../data/progressions';
import {
    PLAIN_PROGRESSIONS, developPalette, paletteNumeral, plainProgression, type PaletteGroup,
} from '../data/progressionPalette';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';

/*
 * Practice 8 — Developing a progression.
 *
 * A plain progression is given — four bars of the key's own triads, one of
 * the ones everybody has heard — and the exercise is what you do to it: swap
 * a triad for its seventh, hang a chord on a suspension, borrow one from
 * outside the key, until the four bars feel like yours. Same bars, same
 * strum, same handoff as Chord progressions; the difference is the palette,
 * which is the point.
 *
 * Deliberately small. The reference this grew from had an instrument, a
 * tempo, a playing style, six chord tabs and a preview pane. Here the palette
 * is three short rows — plain, sevenths, colour — and a chord is heard by
 * putting it in a bar.
 */

/** Shared with the other practices so the eight are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3] as const;
/** One bar at a walking tempo. */
const BAR_SECONDS = 1.5;
/** Fewer changes than this is a listen, not a development. */
const MIN_CHANGES = 2;
/** The playing bar's card, the take-cream the other practices use for "live". */
const LIVE_BG = '#FBFFED';
const GROUPS: PaletteGroup[] = ['plain', 'sevenths', 'colour'];

interface ChordDeveloperProps {
    onBack: () => void;
}

export default function ChordDeveloper({ onBack }: ChordDeveloperProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [key, setKey] = useState<PracticeKey | null>(null);
    const [example, setExample] = useState(0);
    /** The four bars as chord symbols; empty until a key gives them pitches. */
    const [bars, setBars] = useState<string[]>([]);
    const [activeBar, setActiveBar] = useState(0);
    const [playingBar, setPlayingBar] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const palette = key ? developPalette(key) : [];
    const given = key ? plainProgression(key, example) : [];
    const changes = bars.filter((c, i) => c !== given[i]).length;
    const numerals = bars.map(c => paletteNumeral(palette, c));

    /*
     * Playback runs on timeouts, one per bar, reading the bars and loop flag
     * through refs: state would be stale inside a callback scheduled a bar
     * and a half ago, a ref is always now.
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

    /* The loop reschedules itself through a ref rather than by name, so a
       timeout queued a bar ago always reaches the current function. */
    const playFromRef = useRef<(i: number) => void>(() => {});
    const playFrom = (i: number) => {
        const symbol = barsRef.current[i];
        if (symbol) sound(symbol);
        setPlayingBar(i);
        timerRef.current = window.setTimeout(() => {
            const next = i + 1;
            if (next < 4) playFromRef.current(next);
            else if (loopRef.current) playFromRef.current(0);
            else stopPlayback();
        }, BAR_SECONDS * 1000);
    };
    useEffect(() => { playFromRef.current = playFrom; });

    const togglePlayback = () => {
        haptic('tap');
        if (playingBar !== null) { stopPlayback(); return; }
        playFrom(0);
    };

    // Leaving the practice must not leave four bars looping.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingBar !== null;

    const stepDone = useCallback((s: number) => {
        if (s === 1) return key !== null;
        if (s === 2) return changes >= MIN_CHANGES;
        return true;
    }, [key, changes]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * Reaching your progression is the finish. Recorded once per key and
     * bars, and it lights the Mind Power ring the same way the others do.
     */
    const barsId = key ? `${key.id}:${bars.join(' ')}` : '';
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !key) return;
        if (creditedRef.current === barsId) return;
        creditedRef.current = barsId;

        try {
            const storageKey = 'mep-completed-progression-developments';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(barsId)) {
                done.push(barsId);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the progression */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, key, barsId]);

    /** A key: the given progression is re-dealt in it. The shape stays, the chords change. */
    const chooseKey = (k: PracticeKey) => {
        haptic('select');
        stopPlayback();
        setKey(k);
        // The banks differ in length by mode, so the index is folded into the
        // new bank rather than re-rolled: deterministic, and never out of range.
        const idx = example % PLAIN_PROGRESSIONS[k.mode].length;
        setExample(idx);
        setBars(plainProgression(k, idx));
        setActiveBar(0);
    };

    /** Another plain progression, never the one on screen. */
    const newExample = () => {
        if (!key) return;
        haptic('tap');
        stopPlayback();
        const bank = PLAIN_PROGRESSIONS[key.mode];
        const others = bank.map((_, i) => i).filter(i => i !== example);
        const next = others[Math.floor(Math.random() * others.length)];
        setExample(next);
        setBars(plainProgression(key, next));
        setActiveBar(0);
    };

    /** Put a chord in the active bar, sound it, and move to the next bar. */
    const fill = (symbol: string) => {
        haptic('select');
        if (!isPlaying) sound(symbol);
        const next = [...bars];
        next[activeBar] = symbol;
        setBars(next);
        setActiveBar((activeBar + 1) % 4);
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

    /** The same given progression, back to plain. */
    const startOver = () => {
        if (!key) return;
        stopPlayback();
        setBars(plainProgression(key, example));
        setActiveBar(0);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const keyLabel = (k: PracticeKey) =>
        `${k.tonic} ${t(k.mode === 'major' ? 'practice.cp_major' : 'practice.cp_minor')}`;

    const handleContinue = async () => {
        if (sendState === 'sending' || !key) return;
        setSendState('sending');
        const noteId = await createCanvasFromLines(user?.uid, {
            title: t('practice.cp_canvas_title').replace('{key}', keyLabel(key)),
            lines: [],
            // The four chords go over as chord cards, in order.
            chords: bars,
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.cp_ask_key'),
        2: t('practice.dp_ask_develop'),
        3: t('practice.cp_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.cp_nudge_key'),
        2: t('practice.dp_nudge_change'),
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

    /** The four bars. A changed bar is marked, so what you did is visible at a glance. */
    const barRow = (interactive: boolean) => (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bars.map((chord, i) => {
                const active = interactive && activeBar === i;
                const live = playingBar === i;
                const changed = chord !== given[i];
                const inner = (
                    <>
                        <span className="font-sans text-xs uppercase tracking-wide text-stone-400">
                            {t('practice.cp_bar').replace('{n}', String(i + 1))}
                        </span>
                        <span className="mt-1 font-serif text-[2.2rem] leading-none text-stone-900">{chord}</span>
                        <span className={`mt-2 h-4 font-sans text-sm ${changed ? 'font-semibold text-stone-700' : 'text-stone-500'}`}>
                            {numerals[i]}
                        </span>
                    </>
                );
                const cls = `verse-card flex flex-col items-center justify-center rounded-[20px] px-3 py-5 text-center ${active ? 'is-linked' : ''} ${interactive ? '' : 'is-static'}`;
                return interactive ? (
                    <button
                        key={i}
                        type="button"
                        data-cp-bar={i}
                        data-cp-changed={changed ? '' : undefined}
                        onClick={() => { haptic('tap'); setActiveBar(i); }}
                        className={`${cls} cursor-pointer`}
                        style={live ? { backgroundColor: LIVE_BG } : undefined}
                    >
                        {inner}
                    </button>
                ) : (
                    <div key={i} data-cp-bar={i} data-cp-changed={changed ? '' : undefined} className={cls} style={live ? { backgroundColor: LIVE_BG } : undefined}>
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

                {/* 1 — pick a key. Each card shows the chords that come with it. */}
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

                {/* 2 — develop. Tap a bar, then a chord; the chord sounds as it lands. */}
                {step === 2 && key && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {barRow(true)}

                        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                            {GROUPS.map(group => (
                                <div key={group} className="flex items-center gap-3">
                                    <span className="w-16 shrink-0 text-right font-sans text-xs text-stone-400">
                                        {t(`practice.dp_group_${group}`)}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {palette.filter(p => p.group === group).map(p => (
                                            <button
                                                key={p.symbol}
                                                type="button"
                                                data-cp-chip={p.symbol}
                                                title={p.numeral}
                                                onClick={() => fill(p.symbol)}
                                                className={`${group === 'plain' ? btn.secondary('bare') : btn.primary('bare')} h-10 min-w-[3.25rem] px-3.5 font-serif text-base cursor-pointer`}
                                            >
                                                {p.symbol}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {transport}
                            <button
                                type="button"
                                data-dp-new-example
                                onClick={newExample}
                                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer`}
                            >
                                <Shuffle className="h-4 w-4 stroke-[2.2]" />
                                {t('practice.dm_new_example')}
                            </button>
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.dp_given_hint')}</p>
                    </div>
                )}

                {/* 3 — your progression, written in numerals */}
                {step === 3 && key && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {barRow(false)}
                        <p className="text-center font-sans text-sm text-stone-500">
                            <span className="font-semibold text-stone-700">{numerals.join(' – ')}</span>
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
