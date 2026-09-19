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
import { numeralOf } from '../data/progressions';
import { PLAIN_PROGRESSIONS, plainProgression } from '../data/progressionPalette';
import { BEAT_SECONDS, soundNote, type MelodyEvent } from '../lib/melodySynth';
import { BAR_BEATS, playMelodyOverChords, renderMelodyOverChordsWav } from '../lib/chordSynth';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';
import MelodyGrid from './MelodyGrid';

/*
 * Practice 11 — Melody over chords.
 *
 * Four bars of chords are given — a plain progression in the key — and the
 * grid runs underneath them, a beat to a square. Write a melody over the
 * chords and hear the two together; the chords strum on the downbeats while
 * the notes play over them. It leaves for the canvas as both: the chord
 * cards, and a recording of the two, rendered by the same code that played
 * them.
 *
 * Deliberately small. The reference this grew from had an instrument, a
 * tempo, note values and a random-chords button; here the progression is one
 * of the plain ones, the tempo is the grid's, and a beat is a note or a rest.
 */

/** Shared with the other practices so the eleven are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3] as const;
const BARS = 4;
const BEATS = BARS * BAR_BEATS;
/** Fewer than this is a gesture, not a melody. */
const MIN_NOTES = 4;
/** The playing bar's card, the take-cream the other practices use for "live". */
const LIVE_BG = '#FBFFED';

/** Row index per beat, tonic = 0 … seventh = 6; null is a rest. */
type Notes = (number | null)[];
const emptyNotes = (): Notes => Array.from({ length: BEATS }, () => null);

interface MelodyOverChordsProps {
    onBack: () => void;
}

export default function MelodyOverChords({ onBack }: MelodyOverChordsProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [key, setKey] = useState<PracticeKey | null>(null);
    const [example, setExample] = useState(0);
    const [notes, setNotes] = useState<Notes>(emptyNotes);
    const [playingBeat, setPlayingBeat] = useState<number | null>(null);
    const [loop, setLoop] = useState(false);
    /** The rendered file, made once the line is final so Continue is instant.
     *  Carries the id of the line it was rendered from, so a take from an
     *  earlier line is never mistaken for the current one. */
    const [take, setTake] = useState<{ id: string; blob: Blob; seconds: number } | null>(null);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();

    const scale = key ? keyScale(key) : [];
    const chords = key ? plainProgression(key, example) : [];
    const placed = notes.filter(n => n !== null).length;
    const events: MelodyEvent[] = scale.length === 0 ? [] : notes.flatMap((row, beat) =>
        row === null ? [] : [{ beat, freq: scale[row].freq }]);
    const playingBar = playingBeat === null ? null : Math.floor(playingBeat / BAR_BEATS);

    /*
     * Playback: chords and notes for a whole pass are scheduled at once on
     * the audio clock; timeouts only move the highlight, and read what they
     * need through refs so a callback scheduled a pass ago sees things as now.
     */
    const loopRef = useRef(loop);
    useEffect(() => { loopRef.current = loop; }, [loop]);
    const eventsRef = useRef(events);
    const chordsRef = useRef(chords);
    useEffect(() => { eventsRef.current = events; chordsRef.current = chords; });
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
        releaseRef.current = playMelodyOverChords(chordsRef.current, eventsRef.current);
        beatRef.current(0);
    };
    useEffect(() => { beatRef.current = runBeat; startPassRef.current = startPass; });

    const togglePlayback = () => {
        haptic('tap');
        if (playingBeat !== null) { stopPlayback(); return; }
        startPass();
    };

    // Leaving the practice must not leave the bars looping.
    useEffect(() => () => stopPlayback(), [stopPlayback]);

    const isPlaying = playingBeat !== null;

    const stepDone = useCallback((s: number) => {
        if (s === 1) return key !== null;
        if (s === 2) return placed >= MIN_NOTES;
        return true;
    }, [key, placed]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    // Rendered as soon as the line is final, so Continue is instant.
    const notesKey = notes.map(n => (n === null ? '-' : n)).join('');
    const lineId = key ? `${key.id}:${chords.join(' ')}:${notesKey}` : '';
    useEffect(() => {
        if (step !== 3 || !key) return;
        let live = true;
        const id = lineId;
        renderMelodyOverChordsWav(chordsRef.current, eventsRef.current).then(rendered => { if (live) setTake({ id, ...rendered }); });
        return () => { live = false; };
    }, [step, key, lineId]);
    const ready = take && take.id === lineId ? take : null;

    /*
     * Reaching your melody is the finish. Recorded once per key, chords and
     * line, and it lights the Mind Power ring the same way the others do.
     */
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || !key) return;
        if (creditedRef.current === lineId) return;
        creditedRef.current = lineId;

        try {
            const storageKey = 'mep-completed-melodies-over-chords';
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

    /** A key: the chords are re-dealt in it, and a line in the old key goes. */
    const chooseKey = (k: PracticeKey) => {
        haptic('select');
        stopPlayback();
        setKey(k);
        setExample(example % PLAIN_PROGRESSIONS[k.mode].length);
        if (k.id !== key?.id) setNotes(emptyNotes());
    };

    /** Another plain progression under the same line, never the one on screen. */
    const newProgression = () => {
        if (!key) return;
        haptic('tap');
        stopPlayback();
        const bank = PLAIN_PROGRESSIONS[key.mode];
        // Deterministic: the next one along. A melody is kept; it may sit
        // differently over new chords, which is the point of hearing it.
        setExample((example + 1) % bank.length);
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

    /** Another line over the same chords. */
    const startOver = () => {
        stopPlayback();
        setNotes(emptyNotes());
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
        const rendered = ready ?? await renderMelodyOverChordsWav(chords, events);
        const title = t('practice.mc_canvas_title').replace('{key}', keyLabel(key));
        // Both halves go over: the chords as cards, the two together as a recording.
        const noteId = await createCanvasFromLines(user?.uid, {
            title,
            lines: [],
            chords,
            audio: { blob: rendered.blob, seconds: rendered.seconds, title },
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.cp_ask_key'),
        2: t('practice.mc_ask_write'),
        3: t('practice.mw_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.cp_nudge_key'),
        2: t('practice.mw_nudge_notes'),
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

    /** The chords, one to a bar, over the grid. The playing bar is lit. */
    const chordRow = (
        <div className="mx-auto grid w-full max-w-[60rem] grid-cols-4 gap-3 pl-10">
            {chords.map((chord, i) => (
                <div
                    key={i}
                    data-cp-bar={i}
                    className="verse-card is-static flex flex-col items-center justify-center rounded-[16px] px-3 py-3 text-center"
                    style={playingBar === i ? { backgroundColor: LIVE_BG } : undefined}
                >
                    <span className="font-serif text-[1.6rem] leading-none text-stone-900">{chord}</span>
                    <span className="mt-1.5 font-sans text-xs text-stone-500">{key ? numeralOf(key, chord) : ''}</span>
                </div>
            ))}
        </div>
    );

    const grid = (interactive: boolean) => (
        <MelodyGrid
            scale={scale}
            notes={notes}
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

                {/* 2 — write over the chords. They play under whatever is written. */}
                {step === 2 && key && (
                    <div className="flex animate-in flex-col gap-4 duration-300 fade-in">
                        {chordRow}
                        {grid(true)}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {transport}
                            <button
                                type="button"
                                data-mc-new-progression
                                onClick={newProgression}
                                className={`${btn.secondary('bare')} h-12 gap-2.5 px-5 text-base font-semibold cursor-pointer`}
                            >
                                <Shuffle className="h-4 w-4 stroke-[2.2]" />
                                {t('practice.mc_new_progression')}
                            </button>
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.mc_given_hint')}</p>
                    </div>
                )}

                {/* 3 — your melody, over its chords, on its way to the canvas */}
                {step === 3 && key && (
                    <div
                        className="flex animate-in flex-col gap-4 duration-300 fade-in"
                        data-mw-take-seconds={ready?.seconds ?? ''}
                        data-mw-take-bytes={ready?.blob.size ?? ''}
                    >
                        {chordRow}
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
