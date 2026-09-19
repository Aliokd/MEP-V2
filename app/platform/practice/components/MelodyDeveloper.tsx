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
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import { PRACTICE_KEYS, keyScale, type PracticeKey } from '../data/keys';
import { MELODY_EXAMPLES } from '../data/melodyExamples';
import {
    BEAT_SECONDS, playMelody, renderMelodyWav, soundNote, type MelodyEvent,
} from '../lib/melodySynth';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import MelodyGrid from './MelodyGrid';

/*
 * Practice 7 — Developing a melody.
 *
 * Four bars. The first two are given — a short phrase, the call — and the
 * last two are yours, the answer. Pick a key, hear the call, write the
 * answer on the same grid Melody uses, and send the whole line to the canvas
 * as an audio card. The given half can be changed too; it is a starting
 * point, not a rule.
 *
 * Deliberately small. The reference this grew from had note lengths, an
 * octave picker, three views and an instrument menu. Here a beat is a note
 * or a rest, and the one control beyond the grid is "New example", for when
 * the call on offer says nothing to you.
 */

/** Shared with the other practices so the seven are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3] as const;
/** Four bars: two given, two to write. */
const BEATS = 16;
const GIVEN_BEATS = 8;
/** Fewer than this in the answer is a gesture, not an answer. */
const MIN_ANSWER_NOTES = 4;

/** Row index per beat, tonic = 0 … seventh = 6; null is a rest. */
type Notes = (number | null)[];
const withExample = (example: number): Notes => [
    ...MELODY_EXAMPLES[example],
    ...Array.from({ length: BEATS - GIVEN_BEATS }, () => null),
];

interface MelodyDeveloperProps {
    onBack: () => void;
}

export default function MelodyDeveloper({ onBack }: MelodyDeveloperProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [key, setKey] = useState<PracticeKey | null>(null);
    const [example, setExample] = useState(() => Math.floor(Math.random() * MELODY_EXAMPLES.length));
    const [notes, setNotes] = useState<Notes>(() => withExample(example));
    const [playingBeat, setPlayingBeat] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    /** The rendered file, made once the line is final so Continue is instant.
     *  Carries the id of the line it was rendered from, so a take from an
     *  earlier line is never mistaken for the current one. */
    const [take, setTake] = useState<{ id: string; blob: Blob; seconds: number } | null>(null);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const scale = key ? keyScale(key) : [];
    const answerNotes = notes.slice(GIVEN_BEATS).filter(n => n !== null).length;
    // Unlike Melody, the notes are there before the key is — the given half
    // arrives with the example — so they have no pitch until a key is chosen.
    const events: MelodyEvent[] = scale.length === 0 ? [] : notes.flatMap((row, beat) =>
        row === null ? [] : [{ beat, freq: scale[row].freq }]);

    /*
     * Playback: the audio for a whole pass is scheduled at once on the audio
     * clock; timeouts only move the highlight, and read what they need
     * through refs so a callback scheduled a pass ago sees things as now.
     */
    const loopRef = useRef(loop);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    const eventsRef = useRef(events);
    useEffect(() => { eventsRef.current = events; });
    const timerRef = useRef<number | null>(null);
    const releaseRef = useRef<(() => void) | null>(null);

    const stopPlayback = useCallback(() => {
        if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        releaseRef.current?.();
        releaseRef.current = null;
        setPlayingBeat(null);
    }, []);

    /* The beat timer and the pass each reschedule themselves through a ref
       rather than by name, so a timeout queued a beat ago always reaches the
       current function. Neither is memoized: they are only ever called from
       these refs or from a press, and the refs are re-pointed after every
       render. */
    const startPassRef = useRef<() => void>(() => {});
    const beatRef = useRef<(beat: number) => void>(() => {});
    const runBeat = (beat: number) => {
        setPlayingBeat(beat);
        timerRef.current = window.setTimeout(() => {
            const next = beat + 1;
            if (next < BEATS) beatRef.current(next);
            else if (loopRef.current) startPassRef.current();
            else stopPlayback();
        }, BEAT_SECONDS * 1000);
    };
    const startPass = () => {
        releaseRef.current?.();
        releaseRef.current = playMelody(eventsRef.current);
        beatRef.current(0);
    };
    useEffect(() => { beatRef.current = runBeat; startPassRef.current = startPass; });

    const togglePlayback = () => {
        haptic('tap');
        if (playingBeat !== null) { stopPlayback(); return; }
        startPass();
    };

    // Leaving the practice must not leave the line looping.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingBeat !== null;

    const stepDone = useCallback((s: number) => {
        if (s === 1) return key !== null;
        if (s === 2) return answerNotes >= MIN_ANSWER_NOTES;
        return true;
    }, [key, answerNotes]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    // Rendered as soon as the line is final, so Continue is instant.
    const notesKey = notes.map(n => (n === null ? '-' : n)).join('');
    const lineId = key ? `${key.id}:${notesKey}` : '';
    useEffect(() => {
        if (step !== 3 || !key) return;
        let live = true;
        const id = lineId;
        renderMelodyWav(eventsRef.current, BEATS).then(rendered => { if (live) setTake({ id, ...rendered }); });
        return () => { live = false; };
    }, [step, key, lineId]);
    const ready = take && take.id === lineId ? take : null;

    /*
     * Reaching your melody is the finish. Recorded once per key and line,
     * and it lights the Mind Power ring the same way the others do.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !key) return;
        if (creditedRef.current === lineId) return;
        creditedRef.current = lineId;

        try {
            const storageKey = 'mep-completed-melody-developments';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(lineId)) {
                done.push(lineId);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the melody */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, key, lineId]);

    /** The key changes the notes' pitches, not their places: the shape stays. */
    const chooseKey = (k: PracticeKey) => {
        haptic('select');
        stopPlayback();
        setKey(k);
    };

    /** Another call: the next example, never the one on screen. The answer goes. */
    const newExample = () => {
        haptic('tap');
        stopPlayback();
        const others = MELODY_EXAMPLES.map((_, i) => i).filter(i => i !== example);
        const next = others[Math.floor(Math.random() * others.length)];
        setExample(next);
        setNotes(withExample(next));
    };

    /** A square: tap to put the beat's note there, tap again to clear it. */
    const toggle = (beat: number, row: number) => {
        haptic('select');
        const next = [...notes];
        if (next[beat] === row) {
            next[beat] = null;
        } else {
            next[beat] = row;
            if (!isPlaying) soundNote(scale[row].freq);
        }
        setNotes(next);
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

    /** Another answer to the same call. */
    const startOver = () => {
        stopPlayback();
        setNotes(withExample(example));
        setTake(null);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const keyLabel = (k: PracticeKey) =>
        `${k.tonic} ${t(k.mode === 'major' ? 'practice.cp_major' : 'practice.cp_minor')}`;

    const handleContinue = async () => {
        if (sendState === 'sending' || !key) return;
        setSendState('sending');
        const rendered = ready ?? await renderMelodyWav(events, BEATS);
        const title = t('practice.mw_canvas_title').replace('{key}', keyLabel(key));
        const noteId = await createCanvasFromLines(user?.uid, {
            title,
            lines: [],
            audio: { blob: rendered.blob, seconds: rendered.seconds, title },
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.cp_ask_key'),
        2: t('practice.dm_ask_develop'),
        3: t('practice.mw_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.cp_nudge_key'),
        2: t('practice.dm_nudge_answer'),
    };

    /** Play/stop and loop, the same on the writing step and the finished one. */
    const transport = (
        <div className="flex items-center justify-center gap-3">
            <button
                type="button"
                data-mw-play
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
                data-mw-loop
                aria-pressed={loop}
                onClick={() => { haptic('tap'); setLoop(l => !l); }}
                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer ${loop ? 'ring-2 ring-stone-900/60' : ''}`}
            >
                <Repeat className="h-4 w-4 stroke-[2.4]" />
                {t('practice.cp_loop')}
            </button>
        </div>
    );

    const grid = (interactive: boolean) => (
        <MelodyGrid
            scale={scale}
            notes={notes}
            given={beat => beat < GIVEN_BEATS}
            playingBeat={playingBeat}
            interactive={interactive}
            onToggle={toggle}
            maxWidthClass="max-w-[60rem]"
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
                    {key && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {keyLabel(key)}
                        </span>
                    )}
                </div>

                {/* 1 — pick a key. Each card shows the notes it gives you. */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-2 gap-3 duration-300 fade-in sm:grid-cols-3">
                        {PRACTICE_KEYS.map(k => {
                            const picked = key?.id === k.id;
                            return (
                                <button
                                    key={k.id}
                                    type="button"
                                    data-mw-key={k.id}
                                    onClick={() => chooseKey(k)}
                                    className={`verse-card flex flex-col items-start gap-1 rounded-[20px] px-5 py-5 text-left ${picked ? 'is-linked' : ''}`}
                                >
                                    <span className="font-serif text-[1.6rem] leading-tight text-stone-800">
                                        {keyLabel(k)}
                                    </span>
                                    <span className="font-sans text-xs text-stone-500">
                                        {keyScale(k).map(d => d.name).join(' · ')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2 — answer. The call is in purple, yours goes in green. */}
                {step === 2 && key && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        {grid(true)}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {transport}
                            <button
                                type="button"
                                data-dm-new-example
                                onClick={newExample}
                                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer`}
                            >
                                <Shuffle className="h-4 w-4 stroke-[2.2]" />
                                {t('practice.dm_new_example')}
                            </button>
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.dm_given_hint')}</p>
                    </div>
                )}

                {/* 3 — your melody, call and answer, on its way to the canvas */}
                {step === 3 && key && (
                    <div
                        className="flex animate-in flex-col gap-5 duration-300 fade-in"
                        data-mw-take-seconds={ready?.seconds ?? ''}
                        data-mw-take-bytes={ready?.blob.size ?? ''}
                    >
                        {grid(false)}
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
                            aria-label={t('practice.mw_try_another')}
                            title={t('practice.mw_try_another')}
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
