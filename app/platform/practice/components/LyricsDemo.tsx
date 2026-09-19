"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface LyricsDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
    /**
     * Which practice this is guiding. Writing from a feeling taps notes from a
     * pile into a line; Finishing a verse taps words into the line after two
     * given ones. The pile and the copy follow, the construction does not.
     */
    variant?: 'notes' | 'finish';
}

/**
 * The one-step guide shown when Writing from a feeling, or Finishing a verse,
 * is opened.
 *
 * What needs showing is the move into the line: something is tapped and its
 * words land at the end. So the scene is three things to tap — post-its in
 * one variant, plain words in the other — and one line with a word already
 * typed, with a cursor that taps two in turn, each dropping in. Finishing a
 * verse shows the two given lines above, set rather than typed.
 *
 * Same construction as the other guides: one six-second CSS timeline drives
 * the cursor and the drops, so none can drift from the others, and reduced
 * motion gets the finished state as a still. Every rule is written out:
 * styled-jsx takes an expression as a value inside a rule, never as a rule
 * of its own.
 */
export default function LyricsDemo({ onDone, onNeverAgain, variant = 'notes' }: LyricsDemoProps) {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    // Swipe the sheet down to dismiss (phones only — see the hook).
    const { swipeHandlers, swipeStyle } = useSheetSwipe(onDone);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDone();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onDone]);

    if (!mounted) return null;

    const finish = variant === 'finish';
    const copy = finish ? 'finish_demo' : 'lyrics_demo';
    // Three things to tap. The first and third are the ones the cursor takes;
    // the line already has a joining word typed in it.
    const NOTES: { text: string; tint: string; lean: number; taken?: 0 | 1 }[] = [
        { text: t('practice.lyrics_demo_note_a'), tint: '#FBFFED', lean: -2.5, taken: 0 },
        { text: t('practice.lyrics_demo_note_b'), tint: '#A2B0DF', lean: 1.5 },
        { text: t('practice.lyrics_demo_note_c'), tint: '#FBB1FF', lean: -1, taken: 1 },
    ];

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-lyrics-demo data-lyrics-demo-variant={variant} className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px] sheet-backdrop-enter" onClick={onDone} />

            <div className="relative w-full bg-white flex flex-col gap-4 rounded-t-[26px] rounded-b-none border-0 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto no-scrollbar bottom-sheet-enter md:max-w-md md:rounded-[20px] md:border md:border-stone-200/70 md:p-6 md:max-h-none md:overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.18)]" {...swipeHandlers} style={swipeStyle}>
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t(`practice.${copy}_title`)}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t(`practice.${copy}_desc`)}</p>
                    {/* The how is above; this is the one line on why it is worth doing */}
                    <p className="mt-3 text-sm font-sans text-stone-500 leading-relaxed">
                        <span className="font-semibold text-stone-700">{t('practice.demo_why_label')}</span>{' '}
                        {t(`practice.${copy}_why`)}
                    </p>
                </div>

                {/* The scene: two taps into a line */}
                <div className="relative rounded-[14px] bg-[#F0F0EA] px-4 py-4 select-none overflow-hidden" aria-hidden="true">
                    <div className="relative flex h-[150px] flex-col gap-3">
                        {finish ? (
                            <>
                                {/* The given beginning, set */}
                                <div className="flex flex-col gap-0.5 px-1 font-serif text-[14px] leading-snug text-stone-500">
                                    <span className="ld-given">{t('practice.finish_demo_line_a')}</span>
                                    <span className="ld-given">{t('practice.finish_demo_line_b')}</span>
                                </div>
                                {/* Three words to reach for */}
                                <div className="flex justify-center gap-2">
                                    {NOTES.map((n, i) => (
                                        <span
                                            key={i}
                                            className={`ld-note ${n.taken !== undefined ? `ld-taken-${n.taken}` : ''} flex h-8 items-center justify-center rounded-full bg-[#86BE7F] px-3 font-serif text-[14px] text-stone-900`}
                                        >
                                            {n.text}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* The pile */
                            <div className="grid grid-cols-3 gap-3">
                                {NOTES.map((n, i) => (
                                    <span
                                        key={i}
                                        className={`ld-note ${n.taken !== undefined ? `ld-taken-${n.taken}` : ''} flex h-[58px] items-center justify-center rounded-[5px] px-2 text-center font-serif text-[15px] leading-tight text-stone-800 shadow-[0_2px_5px_rgba(0,0,0,0.08)]`}
                                        style={{ backgroundColor: n.tint, transform: `rotate(${n.lean}deg)` }}
                                    >
                                        {n.text}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* The line, one word typed, two arriving */}
                        <div className="flex h-[44px] items-center gap-2 rounded-[12px] bg-white/60 px-4 font-serif text-[16px] text-stone-900">
                            <span className="ld-drop-0">{NOTES[0].text}</span>
                            <span className="text-stone-500">{t('practice.lyrics_demo_join')}</span>
                            <span className="ld-drop-1">{NOTES[2].text}</span>
                            <span className="ld-caret ml-0.5 inline-block h-5 w-[1.5px] bg-stone-900" />
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for its clicks */}
                    <div className="ld-cursor absolute top-0 left-0 w-5 h-5 pointer-events-none">
                        <span className="ld-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
                        <svg width="16" height="16" viewBox="0 0 24 24" className="drop-shadow-sm">
                            <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#1C1917" stroke="#FFFFFF" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>

                {/* Got it closes this visit's showing; the quiet option beside it
                    is the only thing that stops the guide auto-appearing. Column-
                    reversed on the sheet so the primary stays under the thumb. */}
                <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
                    <button
                        type="button"
                        onClick={onNeverAgain}
                        className={`${btn.ghost('sm')} justify-center cursor-pointer`}
                    >
                        {t('practice.dont_show_again')}
                    </button>
                    <button
                        type="button"
                        onClick={onDone}
                        // Full width and thumb-height on the sheet; the right-aligned pill
                        // it is on desktop only works when there is a dialog edge to align to.
                        className={`${btn.primary('touch')} w-full md:w-auto cursor-pointer`}
                    >
                        {t('studio_banner.got_it')}
                    </button>
                </div>
            </div>

            <style jsx>{`
                /*
                 * One shared 6s clock. Beats:
                 *   0–14%   cursor comes in and settles on the first thing to take
                 *   16%     click — it dims, its words appear in the line
                 *   18–40%  cursor travels to the third
                 *   42%     click — the same, after the typed word
                 *   44–90%  the line stands, caret blinking
                 *   96%     reset for the next loop
                 *
                 * Cursor x/y are eyeballed against the dialog's ~400px scene:
                 * the pile's first and third notes sit at (62, 40) and (300, 40);
                 * the finish variant's words sit lower and closer, at (105, 70)
                 * and (270, 70).
                 */
                .ld-cursor {
                    animation: ${finish ? 'ld-cursor-path-finish' : 'ld-cursor-path'} 6s ease-in-out infinite;
                }
                @keyframes ld-cursor-path {
                    0%       { transform: translate(320px, 150px); }
                    14%, 18% { transform: translate(62px, 40px); }
                    40%, 90% { transform: translate(300px, 40px); }
                    100%     { transform: translate(320px, 150px); }
                }
                @keyframes ld-cursor-path-finish {
                    0%       { transform: translate(320px, 150px); }
                    14%, 18% { transform: translate(105px, 70px); }
                    40%, 90% { transform: translate(270px, 70px); }
                    100%     { transform: translate(320px, 150px); }
                }
                .ld-cursor svg {
                    animation: ld-cursor-click 6s ease-in-out infinite;
                }
                @keyframes ld-cursor-click {
                    0%, 14%, 18%, 40%, 44%, 100% { transform: scale(1); }
                    16%, 42%                     { transform: scale(0.78); }
                }
                .ld-pulse {
                    opacity: 0;
                    animation: ld-pulse 6s ease-out infinite;
                }
                @keyframes ld-pulse {
                    0%, 15.9%  { opacity: 0; transform: scale(0.4); }
                    16%        { opacity: 0.7; transform: scale(0.4); }
                    24%, 41.9% { opacity: 0; transform: scale(1.7); }
                    42%        { opacity: 0.7; transform: scale(0.4); }
                    50%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /* A taken note dims on its click */
                .ld-taken-0 { animation: ld-taken-0 6s step-end infinite; }
                .ld-taken-1 { animation: ld-taken-1 6s step-end infinite; }
                @keyframes ld-taken-0 {
                    0%, 15%   { opacity: 1; }
                    16%, 95%  { opacity: 0.35; }
                    96%, 100% { opacity: 1; }
                }
                @keyframes ld-taken-1 {
                    0%, 41%   { opacity: 1; }
                    42%, 95%  { opacity: 0.35; }
                    96%, 100% { opacity: 1; }
                }

                /* Its words land in the line at the same moment */
                .ld-drop-0 { animation: ld-drop-0 6s step-end infinite; }
                .ld-drop-1 { animation: ld-drop-1 6s step-end infinite; }
                @keyframes ld-drop-0 {
                    0%, 15%   { opacity: 0; }
                    16%, 95%  { opacity: 1; }
                    96%, 100% { opacity: 0; }
                }
                @keyframes ld-drop-1 {
                    0%, 41%   { opacity: 0; }
                    42%, 95%  { opacity: 1; }
                    96%, 100% { opacity: 0; }
                }

                /* The caret, blinking on its own clock */
                .ld-caret {
                    animation: ld-caret 1s step-end infinite;
                }
                @keyframes ld-caret {
                    0%, 49%   { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }

                /* Reduced motion: hold the finished state, no cursor */
                @media (prefers-reduced-motion: reduce) {
                    .ld-cursor { display: none; }
                    .ld-note, .ld-drop-0, .ld-drop-1, .ld-caret { animation: none; }
                    .ld-taken-0, .ld-taken-1 { opacity: 0.35; }
                    .ld-drop-0, .ld-drop-1 { opacity: 1; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
