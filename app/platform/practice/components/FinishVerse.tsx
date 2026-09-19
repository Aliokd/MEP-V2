"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Plus, RotateCcw, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/lib/haptics';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';

/*
 * Practice 10 — Finishing a verse.
 *
 * A beginning is given — two lines, with a rhythm and a rhyme already in
 * them — and the exercise is the lines that follow. A row of words sits
 * beneath for when one will not come; tap one and it drops into the line
 * you are on. Your lines leave for the canvas as a verse; the given ones
 * were a prompt, not yours to keep.
 *
 * Deliberately small. The reference this grew from had four tabs of
 * suggestions and a verse counter; here the beginnings are a short list to
 * choose from and the words are one row, re-dealt on a press.
 */

/** Shared with the other practices so the ten are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const WORD_SIZE = 'text-[1.4rem]';
const LINE_SIZE = 'text-[1.2rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3] as const;
/** How many beginnings the locale files carry. */
const OPENINGS = 8;
/** How many words the pool holds, and how many are dealt at once. */
const WORD_POOL = 24;
const WORDS_SHOWN = 8;
/** A verse needs a second line of yours to be finished. */
const MIN_LINES = 2;
const MAX_LINES = 6;

interface FinishVerseProps {
    onBack: () => void;
}

export default function FinishVerse({ onBack }: FinishVerseProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [opening, setOpening] = useState<number | null>(null);
    const [lines, setLines] = useState<string[]>(['', '']);
    const [activeLine, setActiveLine] = useState(0);
    /** Where in the word pool the dealt row starts; New words moves it on. */
    const [wordOffset, setWordOffset] = useState(0);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();
    const lineRefs = useRef<(HTMLInputElement | null)[]>([]);

    const given = opening === null ? [] : [
        t(`practice.fv_opening_${opening + 1}_a`),
        t(`practice.fv_opening_${opening + 1}_b`),
    ];
    const words = Array.from({ length: WORDS_SHOWN }, (_, i) =>
        t(`practice.fv_word_${((wordOffset + i) % WORD_POOL) + 1}`));
    const filledLines = lines.map(l => l.trim()).filter(l => l !== '');
    /** A word has been used once it is in a line. Derived, so deleting it brings the word back. */
    const used = (word: string) => lines.some(l => l.toLowerCase().includes(word.toLowerCase()));

    const stepDone = useCallback((s: number) => {
        if (s === 1) return opening !== null;
        if (s === 2) return filledLines.length >= MIN_LINES;
        return true;
    }, [opening, filledLines.length]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * Reaching your verse is the finish. Recorded once per beginning and
     * verse, and it lights the Mind Power ring the same way the others do.
     */
    const verseId = opening === null ? '' : `${opening + 1}:${filledLines.join(' / ')}`;
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 3 || opening === null) return;
        if (creditedRef.current === verseId) return;
        creditedRef.current = verseId;

        try {
            const storageKey = 'mep-completed-verse-finishes';
            const done: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!done.includes(verseId)) {
                done.push(verseId);
                safeLocalStorageSetItem(storageKey, JSON.stringify(done));
            }
        } catch { /* a full quota must not cost the verse */ }

        haptic('success');
        window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
            detail: { triggerType: 'major-task' },
        }));
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
    }, [step, opening, verseId]);

    /** A beginning. A different one empties the lines: they answered the old one. */
    const chooseOpening = (i: number) => {
        haptic('select');
        if (i !== opening) {
            setLines(['', '']);
            setActiveLine(0);
            // Each beginning deals a different stretch of the pool to start with.
            setWordOffset((i * WORDS_SHOWN) % WORD_POOL);
        }
        setOpening(i);
    };

    /** The next stretch of the pool. Deterministic: a press always moves on by a
     *  row. The caret goes back to the line — reaching for words is part of
     *  writing the line, not a step away from it. */
    const newWords = () => {
        haptic('tap');
        setWordOffset(o => (o + WORDS_SHOWN) % WORD_POOL);
        lineRefs.current[activeLine]?.focus();
    };

    /** A word drops at the end of the line you are on. */
    const dropWord = (word: string) => {
        haptic('select');
        const next = [...lines];
        const current = next[activeLine] ?? '';
        next[activeLine] = current.trim() === '' ? word : `${current.replace(/\s+$/, '')} ${word}`;
        setLines(next);
        lineRefs.current[activeLine]?.focus();
    };

    const setLine = (i: number, value: string) => {
        const next = [...lines];
        next[i] = value;
        setLines(next);
    };

    const addLine = () => {
        if (lines.length >= MAX_LINES) return;
        haptic('tap');
        setLines([...lines, '']);
        setActiveLine(lines.length);
    };

    /** Enter moves to the next line, making one if there is not one yet;
     *  Backspace on an empty line beyond the first two takes the line away. */
    const onLineKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (i === lines.length - 1) addLine();
            else setActiveLine(i + 1);
        } else if (e.key === 'Backspace' && lines[i] === '' && lines.length > MIN_LINES) {
            e.preventDefault();
            setLines(lines.filter((_, j) => j !== i));
            setActiveLine(Math.max(0, i - 1));
        }
    };

    // Focus follows the active line, so a tap on a word lands where the eye is.
    useEffect(() => { lineRefs.current[activeLine]?.focus(); }, [activeLine]);

    const goNext = () => {
        if (!stepDone(step)) { nudge(); return; }
        clearNudge();
        setStep(s => Math.min(3, s + 1));
    };

    const goBack = () => {
        if (step === 1) { onBack(); return; }
        setStep(s => s - 1);
    };

    /** The same beginning, finished again. */
    const startOver = () => {
        setLines(['', '']);
        setActiveLine(0);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || opening === null) return;
        setSendState('sending');
        // Your lines, not the given ones: the beginning was a prompt.
        const noteId = await createCanvasFromLines(user?.uid, {
            title: t('practice.fv_canvas_title'),
            lines: filledLines,
            sectionName: 'Verse 1',
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.fv_ask_opening'),
        2: t('practice.fv_ask_write'),
        3: t('practice.fv_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.fv_nudge_opening'),
        2: t('practice.fv_nudge_lines'),
    };

    /** The given lines, numbered like the ones that follow, but set rather than typed. */
    const givenLines = (
        <>
            {given.map((line, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-right font-sans text-xs tabular-nums text-stone-400">{i + 1}</span>
                    <p className={`w-full px-5 py-3 font-serif ${LINE_SIZE} text-stone-500`} data-fv-given>{line}</p>
                </div>
            ))}
        </>
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
                    {opening !== null && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {t('practice.fv_opening_tag').replace('{n}', String(opening + 1))}
                        </span>
                    )}
                </div>

                {/* 1 — a beginning: two lines, on a card each */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-1 gap-3 duration-300 fade-in sm:grid-cols-2">
                        {Array.from({ length: OPENINGS }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                data-fv-opening={i + 1}
                                onClick={() => chooseOpening(i)}
                                className={`verse-card flex flex-col items-start gap-1 rounded-[20px] px-6 py-5 text-left ${opening === i ? 'is-linked' : ''}`}
                            >
                                <span className={`font-serif ${LINE_SIZE} leading-snug text-stone-800`}>
                                    {t(`practice.fv_opening_${i + 1}_a`)}
                                </span>
                                <span className={`font-serif ${LINE_SIZE} leading-snug text-stone-800`}>
                                    {t(`practice.fv_opening_${i + 1}_b`)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* 2 — the lines that follow, with a row of words to reach for */}
                {step === 2 && opening !== null && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
                            {givenLines}
                            {lines.map((line, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 shrink-0 text-right font-sans text-xs tabular-nums text-stone-400">{given.length + i + 1}</span>
                                    <input
                                        ref={el => { lineRefs.current[i] = el; }}
                                        data-fv-line={i}
                                        type="text"
                                        value={line}
                                        onFocus={() => setActiveLine(i)}
                                        onChange={e => setLine(i, e.target.value)}
                                        onKeyDown={e => onLineKey(i, e)}
                                        autoFocus={i === 0}
                                        className={`verse-card is-static w-full rounded-[16px] px-5 py-3 font-serif ${LINE_SIZE} text-stone-900 outline-none ${activeLine === i ? 'ring-2 ring-[#86BE7F]' : ''}`}
                                    />
                                </div>
                            ))}
                            {lines.length < MAX_LINES && (
                                <button
                                    type="button"
                                    data-fv-add-line
                                    onClick={addLine}
                                    className={`${btn.ghost('sm')} self-center cursor-pointer`}
                                >
                                    <Plus className="h-4 w-4 stroke-[2.4]" />
                                    {t('practice.ln_add_line')}
                                </button>
                            )}
                        </div>

                        {/* The words. Greyed once they are in a line. */}
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {words.map(word => {
                                const dim = used(word);
                                return (
                                    <button
                                        key={word}
                                        type="button"
                                        data-fv-word={word}
                                        aria-pressed={dim}
                                        onClick={() => dropWord(word)}
                                        className={`${dim ? btn.secondary('bare') : btn.primary('bare')} h-11 px-4 font-serif text-lg cursor-pointer ${dim ? 'opacity-60' : ''}`}
                                    >
                                        {word}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                data-fv-new-words
                                onClick={newWords}
                                aria-label={t('practice.fv_new_words')}
                                title={t('practice.fv_new_words')}
                                className={`${btn.icon('bare')} h-11 w-11 shrink-0 cursor-pointer`}
                            >
                                <Shuffle className="h-4 w-4 stroke-[2.2]" />
                            </button>
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.fv_words_hint')}</p>
                    </div>
                )}

                {/* 3 — the verse whole, the given lines set and yours after them */}
                {step === 3 && opening !== null && (
                    <div className="verse-card is-static mx-auto flex w-full max-w-2xl animate-in flex-col gap-2 rounded-[20px] px-6 py-6 text-center duration-300 fade-in md:px-8" data-fv-verse>
                        {given.map((l, i) => (
                            <p key={`g-${i}`} className={`font-serif ${WORD_SIZE} leading-snug text-stone-500`}>{l}</p>
                        ))}
                        {filledLines.map((l, i) => (
                            <p key={i} className={`font-serif ${WORD_SIZE} leading-snug text-stone-900`}>{l}</p>
                        ))}
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
                            aria-label={t('practice.fv_try_another')}
                            title={t('practice.fv_try_another')}
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
