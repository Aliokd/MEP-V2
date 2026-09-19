"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Plus, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/lib/haptics';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { createCanvasFromLines } from '@/lib/createCanvasFromLines';
import Confetti from '@/app/onboarding/components/Confetti';
import * as btn from '@/app/platform/components/buttonStyles';
import { TAG_BG, SECTION_TEXT, WRONG_TEXT } from '../data/sections';
import { useThemeLibrary } from '../lib/library';
import { useNudge } from '../lib/useNudge';
import NudgeMessage from './NudgeMessage';

/*
 * Practice 6 — Writing from a feeling.
 *
 * Choose a theme, scribble notes on it without judging them, then tap the
 * notes into lines. The notes are the first draft — fragments, not lines —
 * and the exercise is letting them pile up before building anything, so the
 * verse arrives already full of things worth saying. The lines leave for the
 * canvas as a verse, the way Composing verses' do.
 *
 * Deliberately small. The reference this grew from dragged notes into slots
 * between typed connectors; here a tap drops a note at the end of the line
 * you are on, and the connecting words are typed in the line itself. Same
 * result, one gesture, and it works with a thumb.
 */

/** Shared with the other practices so the six are cut from one size. */
const ASK_SIZE = 'text-lg lg:text-[1.575rem]';
const WORD_SIZE = 'text-[1.4rem]';
const LINE_SIZE = 'text-[1.2rem]';
const ACTION_H = 'h-14';
const ACTION_SIZE = `${ACTION_H} gap-2.5 px-8 text-base font-semibold`;
/** Dark tones only: the burst crosses the green button and the beige panel. */
const BURST_ON_GREEN = ['#363636', '#3F6B3A', '#5F9857'] as const;

const STEPS = [1, 2, 3, 4] as const;
/** Fewer notes than this is a list, not a pile. */
const MIN_NOTES = 6;
const MAX_NOTES = 16;
/** A verse needs a second line to be a verse. */
const MIN_LINES = 2;
const MAX_LINES = 8;

/*
 * The accent palette, ink on top — the brand's decorative colours, which is
 * what a post-it is. Each note takes the next one and a slight lean of its
 * own, so a pile of them reads as a pile rather than a grid.
 */
const NOTE_TINTS = ['#FBFFED', '#A2B0DF', '#FBB1FF', '#ADCDC0', '#EDFF8E'] as const;
const NOTE_LEANS = [-2.5, 1.5, -1, 2, -1.5] as const;

interface Note { id: string; text: string }

interface LyricNotesProps {
    onBack: () => void;
}

export default function LyricNotes({ onBack }: LyricNotesProps) {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    // Authored in the admin console; falls back to the bundled list.
    const themes = useThemeLibrary(language);

    const [step, setStep] = useState(1);
    const [topic, setTopic] = useState<string | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [draft, setDraft] = useState('');
    const [lines, setLines] = useState<string[]>(['']);
    const [activeLine, setActiveLine] = useState(0);
    const [sendState, setSendState] = useState<'idle' | 'sending' | 'failed'>('idle');
    const { count: nudgeCount, nudge, clear: clearNudge, shakeKey, shakeClass } = useNudge();
    const draftRef = useRef<HTMLInputElement>(null);
    const lineRefs = useRef<(HTMLInputElement | null)[]>([]);

    const filledLines = lines.map(l => l.trim()).filter(l => l !== '');
    /** A note has been used once its words are in a line. Derived rather than
     *  tracked, so deleting the words from the line brings the note back. */
    const used = (note: Note) => lines.some(l => l.toLowerCase().includes(note.text.toLowerCase()));

    const stepDone = useCallback((s: number) => {
        if (s === 1) return topic !== null;
        if (s === 2) return notes.length >= MIN_NOTES;
        if (s === 3) return filledLines.length >= MIN_LINES;
        return true;
    }, [topic, notes.length, filledLines.length]);

    const satisfied = stepDone(step);
    useEffect(() => { clearNudge(); }, [step, satisfied, clearNudge]);

    /*
     * Reaching your lyrics is the finish. Recorded once per theme and verse,
     * and it lights the Mind Power ring the same way the others do.
     */
    const verseId = topic ? `${topic}:${filledLines.join(' / ')}` : '';
    const creditedRef = useRef<string | null>(null);
    useEffect(() => {
        if (step !== 4 || !topic) return;
        if (creditedRef.current === verseId) return;
        creditedRef.current = verseId;

        try {
            const storageKey = 'mep-completed-lyric-notes';
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
    }, [step, topic, verseId]);

    const chooseTopic = (label: string) => {
        haptic('select');
        setTopic(label);
        // A new theme is a new pile; the old notes were about something else.
        if (label !== topic) { setNotes([]); setLines(['']); setActiveLine(0); }
    };

    /** The draft becomes a note. Duplicates and blanks are simply not added. */
    const addNote = () => {
        const text = draft.trim();
        if (!text || notes.length >= MAX_NOTES) return;
        if (notes.some(n => n.text.toLowerCase() === text.toLowerCase())) { setDraft(''); return; }
        haptic('select');
        setNotes([...notes, { id: `${Date.now()}-${notes.length}`, text }]);
        setDraft('');
        draftRef.current?.focus();
    };

    const removeNote = (id: string) => {
        haptic('tap');
        setNotes(notes.filter(n => n.id !== id));
    };

    /** A note drops at the end of the line you are on. */
    const dropNote = (note: Note) => {
        haptic('select');
        const next = [...lines];
        const current = next[activeLine] ?? '';
        next[activeLine] = current.trim() === '' ? note.text : `${current.replace(/\s+$/, '')} ${note.text}`;
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
     *  Backspace on an empty line that is not the first takes the line away. */
    const onLineKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (i === lines.length - 1) addLine();
            else setActiveLine(i + 1);
        } else if (e.key === 'Backspace' && lines[i] === '' && lines.length > 1) {
            e.preventDefault();
            const next = lines.filter((_, j) => j !== i);
            setLines(next);
            setActiveLine(Math.max(0, i - 1));
        }
    };

    // Focus follows the active line, so a tap on a note lands where the eye is.
    useEffect(() => { lineRefs.current[activeLine]?.focus(); }, [activeLine]);

    const goNext = () => {
        if (!stepDone(step)) { nudge(); return; }
        clearNudge();
        setStep(s => Math.min(4, s + 1));
    };

    const goBack = () => {
        if (step === 1) { onBack(); return; }
        setStep(s => s - 1);
    };

    /** The same theme, a fresh pile. */
    const startOver = () => {
        setNotes([]);
        setLines(['']);
        setActiveLine(0);
        setSendState('idle');
        creditedRef.current = null;
        setStep(2);
    };

    const handleContinue = async () => {
        if (sendState === 'sending' || !topic) return;
        setSendState('sending');
        const noteId = await createCanvasFromLines(user?.uid, {
            title: t('practice.ln_canvas_title').replace('{topic}', topic),
            lines: filledLines,
            sectionName: 'Verse 1',
        });
        if (!noteId) { setSendState('failed'); return; }
        router.push(`/platform/create?noteId=${noteId}`);
    };

    const ASKS: Record<number, string> = {
        1: t('practice.choose_theme'),
        2: t('practice.ln_ask_notes'),
        3: t('practice.ln_ask_lines'),
        4: t('practice.ln_ask_done'),
    };
    const NUDGES: Record<number, string> = {
        1: t('practice.ln_nudge_topic'),
        2: t('practice.ln_nudge_notes'),
        3: t('practice.ln_nudge_lines'),
    };

    /** A note as a post-it: its tint and lean come from its place in the pile. */
    const postIt = (note: Note, i: number, onTap: () => void, dim: boolean) => (
        <button
            key={note.id}
            type="button"
            data-ln-note={note.id}
            onClick={onTap}
            style={{ backgroundColor: NOTE_TINTS[i % NOTE_TINTS.length], transform: `rotate(${NOTE_LEANS[i % NOTE_LEANS.length]}deg)` }}
            className={`flex min-h-[5.5rem] w-full items-center justify-center rounded-[6px] px-3 py-3 text-center font-serif ${WORD_SIZE} leading-tight text-stone-800 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-opacity cursor-pointer hover:brightness-[0.97] ${dim ? 'opacity-35' : ''}`}
        >
            {note.text}
        </button>
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
                    {topic && step > 1 && (
                        <span
                            style={{ backgroundColor: TAG_BG, color: SECTION_TEXT }}
                            className="shrink-0 rounded-full px-3 py-1 font-sans text-xs"
                        >
                            {topic}
                        </span>
                    )}
                </div>

                {/* 1 — a theme, from the same library Composing verses draws on */}
                {step === 1 && (
                    <div className="grid animate-in grid-cols-2 gap-4 duration-300 fade-in sm:grid-cols-3 lg:grid-cols-4">
                        {themes.map(theme => (
                            <button
                                key={theme.id}
                                type="button"
                                data-ln-topic={theme.id}
                                onClick={() => chooseTopic(theme.label)}
                                className={`verse-card flex h-24 items-center justify-center rounded-[20px] px-4 text-center font-sans leading-tight ${WORD_SIZE} text-stone-700 ${topic === theme.label ? 'is-linked' : ''}`}
                            >
                                {theme.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* 2 — the pile. One field, and every Enter is another note. */}
                {step === 2 && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        <div className="verse-card is-static mx-auto flex w-full max-w-2xl items-center gap-2 rounded-[20px] px-3 py-2">
                            <input
                                ref={draftRef}
                                data-ln-note-input
                                type="text"
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
                                placeholder={t('practice.ln_note_placeholder')}
                                maxLength={60}
                                autoFocus
                                className={`min-w-0 flex-1 bg-transparent px-3 py-2 font-serif ${LINE_SIZE} text-stone-900 outline-none placeholder:text-stone-300`}
                            />
                            <button
                                type="button"
                                data-ln-add
                                onClick={addNote}
                                className={`${btn.primary('bare')} h-11 shrink-0 gap-1.5 px-4 text-sm font-semibold cursor-pointer`}
                            >
                                <Plus className="h-4 w-4 stroke-[2.6]" />
                                {t('practice.ln_add')}
                            </button>
                        </div>

                        {notes.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                {notes.map((n, i) => postIt(n, i, () => removeNote(n.id), false))}
                            </div>
                        )}
                        <p className="text-center font-sans text-xs text-stone-400">
                            {notes.length === 0 ? t('practice.ln_notes_empty') : t('practice.ln_notes_hint')}
                        </p>
                    </div>
                )}

                {/* 3 — the lines. Notes above, greying as they are used; the line
                    you are on takes a tapped note at its end. */}
                {step === 3 && (
                    <div className="flex animate-in flex-col gap-5 duration-300 fade-in">
                        <div className="flex flex-wrap justify-center gap-2">
                            {notes.map(n => {
                                const dim = used(n);
                                return (
                                    <button
                                        key={n.id}
                                        type="button"
                                        data-ln-chip={n.id}
                                        aria-pressed={dim}
                                        onClick={() => dropNote(n)}
                                        className={`${dim ? btn.secondary('bare') : btn.primary('bare')} h-11 px-4 font-serif text-lg cursor-pointer ${dim ? 'opacity-60' : ''}`}
                                    >
                                        {n.text}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
                            {lines.map((line, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 shrink-0 text-right font-sans text-xs tabular-nums text-stone-400">{i + 1}</span>
                                    <input
                                        ref={el => { lineRefs.current[i] = el; }}
                                        data-ln-line={i}
                                        type="text"
                                        value={line}
                                        onFocus={() => setActiveLine(i)}
                                        onChange={e => setLine(i, e.target.value)}
                                        onKeyDown={e => onLineKey(i, e)}
                                        className={`verse-card is-static w-full rounded-[16px] px-5 py-3 font-serif ${LINE_SIZE} text-stone-900 outline-none ${activeLine === i ? 'ring-2 ring-[#86BE7F]' : ''}`}
                                    />
                                </div>
                            ))}
                            {lines.length < MAX_LINES && (
                                <button
                                    type="button"
                                    data-ln-add-line
                                    onClick={addLine}
                                    className={`${btn.ghost('sm')} self-center cursor-pointer`}
                                >
                                    <Plus className="h-4 w-4 stroke-[2.4]" />
                                    {t('practice.ln_add_line')}
                                </button>
                            )}
                        </div>
                        <p className="text-center font-sans text-xs text-stone-400">{t('practice.ln_lines_hint')}</p>
                    </div>
                )}

                {/* 4 — the verse, on its way to the canvas */}
                {step === 4 && (
                    <div className="verse-card is-static mx-auto flex w-full max-w-2xl animate-in flex-col gap-2 rounded-[20px] px-6 py-6 text-center duration-300 fade-in md:px-8" data-ln-verse>
                        {filledLines.map((l, i) => (
                            <p key={i} className={`font-serif ${WORD_SIZE} leading-snug text-stone-900`}>{l}</p>
                        ))}
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
                            aria-label={t('practice.ln_try_another')}
                            title={t('practice.ln_try_another')}
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
