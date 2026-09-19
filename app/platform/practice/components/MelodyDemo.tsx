"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface MelodyDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
    /**
     * Which practice this is guiding. Melody writes eight beats from nothing;
     * Developing a melody answers four given beats with four of its own. The
     * scene and the copy follow, the construction does not change.
     */
    variant?: 'write' | 'develop' | 'chords';
}

/**
 * The one-step guide shown when Melody, or Developing a melody, is opened.
 *
 * What needs showing is the grid: a square is a note on a beat, tapping puts
 * one there, and play runs the line. So the scene is a small grid with a few
 * notes already down, a cursor that adds two more, and a press of play that
 * sweeps the beats left to right. For Developing a melody the notes already
 * down are the given half, in the given purple, and the cursor adds to the
 * other half.
 *
 * Same construction as the other guides: one six-second CSS timeline drives
 * the cursor, the fills and the sweep, so none can drift from the others,
 * and reduced motion gets the finished state as a still.
 *
 * Every rule below is written out by hand. styled-jsx takes an expression as
 * a value inside a rule, never as a rule of its own — a rule built from a
 * template string is silently not there — which is why the sweep is one
 * playhead element with eight stops rather than eight generated column
 * animations, and the two fills carry fixed "first" and "second" classes.
 */
export default function MelodyDemo({ onDone, onNeverAgain, variant = 'write' }: MelodyDemoProps) {
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

    /*
     * Five rows by eight beats — fewer rows than the real grid, which is what
     * fits a dialog. Row indices are from the top. Fixed rather than random:
     * a line that is different on every open is one nobody wrote.
     *
     * Write:   notes down on beats 1, 2, 4, 6, 8; the cursor adds 3 and 7.
     * Develop: the given call on beats 1–4; the cursor answers on 6 and 8.
     */
    const ROWS = 5;
    const BEATS = 8;
    const develop = variant === 'develop';
    const overChords = variant === 'chords';
    const DOWN: Record<number, number> = develop
        ? { 0: 4, 1: 3, 2: 2, 3: 1 }
        : { 0: 4, 1: 3, 3: 2, 5: 3, 7: 4 };
    const ADDED: [number, number][] = develop ? [[5, 2], [7, 4]] : [[2, 1], [6, 2]];
    const copy = develop ? 'develop_demo' : overChords ? 'chords_melody_demo' : 'melody_demo';
    // Over chords, the strip above the grid: one chord to each pair of beats
    // in this eight-beat scene, so the four bars read at a glance.
    const CHORDS = ['C', 'G', 'Am', 'F'];

    // The cursor's targets, from the scene's geometry: a beat is 44px wide
    // from x=30, a row 22px tall from y=10, in a ~400px dialog. The chord
    // strip, where there is one, pushes the grid and Play down by its height.
    const dy = overChords ? 34 : 0;
    const at = ([beat, row]: [number, number]) => `translate(${30 + beat * 44}px, ${10 + row * 22 + dy}px)`;
    const playAt = `translate(185px, ${128 + dy}px)`;

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-melody-demo data-melody-demo-variant={variant} className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
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

                {/* The scene: two taps, then play */}
                <div className="relative rounded-[14px] bg-[#F0F0EA] px-4 py-4 select-none overflow-hidden" aria-hidden="true">
                    <div className={`relative flex flex-col gap-3 ${overChords ? 'h-[184px]' : 'h-[150px]'}`}>
                        {/* Over chords: the progression sits above the grid, one
                            chord to a pair of beats here */}
                        {overChords && (
                            <div
                                className="grid gap-[3px]"
                                style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) 0.375rem repeat(2, minmax(0, 1fr))' }}
                            >
                                {CHORDS.map((chord, i) => [
                                    i === 2 ? <span key="gap" /> : null,
                                    <span
                                        key={chord}
                                        className="md-chord flex h-[22px] items-center justify-center rounded-[5px] bg-white/60 font-serif text-[13px] text-stone-700"
                                    >
                                        {chord}
                                    </span>,
                                ])}
                            </div>
                        )}

                        {/* The bar line is a narrow column between beats four and
                            five, as on the real grid. The playhead rides over it. */}
                        <div className="relative">
                            <div
                                className="grid gap-[3px]"
                                style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 0.375rem repeat(4, minmax(0, 1fr))' }}
                            >
                                {Array.from({ length: ROWS * BEATS }, (_, i) => {
                                    const row = Math.floor(i / BEATS);
                                    const beat = i % BEATS;
                                    const down = DOWN[beat] === row;
                                    const addedAt = ADDED.findIndex(([b, r]) => b === beat && r === row);
                                    const cell = (
                                        <span
                                            key={i}
                                            data-beat={beat}
                                            className={`md-cell ${addedAt === 0 ? 'md-add md-add-first' : addedAt === 1 ? 'md-add md-add-second' : ''} h-[19px] rounded-[4px] ${down ? (develop ? 'bg-[#B79DF0]' : 'bg-[#86BE7F]') : 'bg-white/60'}`}
                                        />
                                    );
                                    return beat === 4 ? [<span key={`gap-${row}`} />, cell] : cell;
                                })}
                            </div>
                            <span className="md-head pointer-events-none absolute top-0 h-full rounded-[4px] bg-stone-900/10" />
                        </div>

                        {/* Play, pressed after the two taps */}
                        <div className="flex justify-center">
                            <span className="md-play flex h-8 items-center gap-1.5 rounded-full bg-[#86BE7F] px-4 font-sans text-xs font-semibold text-stone-900">
                                <Play className="h-3 w-3 fill-current stroke-none" />
                                {t('practice.cp_play')}
                            </span>
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for its clicks */}
                    <div className="md-cursor absolute top-0 left-0 w-5 h-5 pointer-events-none">
                        <span className="md-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
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
                 *   0–10%   cursor comes in and settles on the first square it adds
                 *   12%     click — the square fills
                 *   14–24%  cursor travels to the second
                 *   26%     click — that one fills
                 *   28–40%  cursor drops to Play
                 *   42%     click — playback starts
                 *   44–92%  the playhead steps across the eight beats, 6% each
                 *   96%     reset for the next loop
                 */
                .md-cursor {
                    animation: md-cursor-path 6s ease-in-out infinite;
                }
                @keyframes md-cursor-path {
                    0%       { transform: translate(320px, 160px); }
                    10%, 14% { transform: ${at(ADDED[0])}; }
                    24%, 28% { transform: ${at(ADDED[1])}; }
                    40%, 92% { transform: ${playAt}; }
                    100%     { transform: translate(320px, 160px); }
                }
                .md-cursor svg {
                    animation: md-cursor-click 6s ease-in-out infinite;
                }
                @keyframes md-cursor-click {
                    0%, 10%, 14%, 24%, 28%, 40%, 44%, 100% { transform: scale(1); }
                    12%, 26%, 42%                          { transform: scale(0.78); }
                }
                .md-pulse {
                    opacity: 0;
                    animation: md-pulse 6s ease-out infinite;
                }
                @keyframes md-pulse {
                    0%, 11.9%  { opacity: 0; transform: scale(0.4); }
                    12%        { opacity: 0.7; transform: scale(0.4); }
                    19%, 25.9% { opacity: 0; transform: scale(1.7); }
                    26%        { opacity: 0.7; transform: scale(0.4); }
                    33%, 41.9% { opacity: 0; transform: scale(1.7); }
                    42%        { opacity: 0.7; transform: scale(0.4); }
                    49%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /* The two squares the cursor fills, each on its click */
                .md-add-first  { animation: md-add-first 6s step-end infinite; }
                .md-add-second { animation: md-add-second 6s step-end infinite; }
                @keyframes md-add-first {
                    0%, 11%   { background-color: rgba(255,255,255,0.6); }
                    12%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes md-add-second {
                    0%, 25%   { background-color: rgba(255,255,255,0.6); }
                    26%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }

                /* Play holds its press for the length of the run */
                .md-play {
                    animation: md-play 6s step-end infinite;
                }
                @keyframes md-play {
                    0%, 41%   { background-color: #86BE7F; }
                    42%, 92%  { background-color: #5F9857; }
                    93%, 100% { background-color: #86BE7F; }
                }

                /*
                 * The playhead: one beat wide, stepping across the grid a beat
                 * at a time for the length of the run. A beat is an eighth of
                 * the width less the bar-line column; beats past the bar line
                 * sit that column further right.
                 */
                .md-head {
                    width: calc((100% - 0.375rem) / 8);
                    opacity: 0;
                    animation: md-head 6s step-end infinite;
                }
                @keyframes md-head {
                    0%, 43%   { opacity: 0; left: 0; }
                    44%       { opacity: 1; left: 0; }
                    50%       { left: calc(1 * (100% - 0.375rem) / 8); }
                    56%       { left: calc(2 * (100% - 0.375rem) / 8); }
                    62%       { left: calc(3 * (100% - 0.375rem) / 8); }
                    68%       { left: calc(4 * (100% - 0.375rem) / 8 + 0.375rem); }
                    74%       { left: calc(5 * (100% - 0.375rem) / 8 + 0.375rem); }
                    80%       { left: calc(6 * (100% - 0.375rem) / 8 + 0.375rem); }
                    86%       { left: calc(7 * (100% - 0.375rem) / 8 + 0.375rem); }
                    92%, 100% { opacity: 0; left: calc(7 * (100% - 0.375rem) / 8 + 0.375rem); }
                }

                /* Reduced motion: hold the finished state, no cursor, no playhead */
                @media (prefers-reduced-motion: reduce) {
                    .md-cursor, .md-head { display: none; }
                    .md-cell, .md-play { animation: none; }
                    .md-add { background-color: #86BE7F; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
