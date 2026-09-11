"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface ChordDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
}

/**
 * The one-step guide shown when Chord progressions is opened.
 *
 * What needs showing is the build step: a bar takes a chord from the row of
 * chips beneath it, and play runs the four bars round. So the scene is four
 * bars, three chips, and a cursor that fills the last empty bar and then
 * presses play, with the bars lighting in turn.
 *
 * Same construction as the other three guides: one six-second CSS timeline
 * drives the cursor, the bar's fill and the playback sweep, so none can drift
 * from the others, and reduced motion gets the finished state as a still.
 */
export default function ChordDemo({ onDone, onNeverAgain }: ChordDemoProps) {
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

    // Three bars already filled, the fourth waiting: the scene shows one move,
    // not the whole build. C G Am, and F is what the cursor brings.
    const BARS = ['C', 'G', 'Am', null] as const;
    const CHIPS = ['F', 'Dm', 'Em'] as const;

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-chord-demo className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px] sheet-backdrop-enter" onClick={onDone} />

            <div className="relative w-full bg-white flex flex-col gap-4 rounded-t-[26px] rounded-b-none border-0 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto no-scrollbar bottom-sheet-enter md:max-w-md md:rounded-[20px] md:border md:border-stone-200/70 md:p-6 md:max-h-none md:overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.18)]" {...swipeHandlers} style={swipeStyle}>
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t('practice.chord_demo_title')}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t('practice.chord_demo_desc')}</p>
                    {/* The how is above; this is the one line on why it is worth doing */}
                    <p className="mt-3 text-sm font-sans text-stone-500 leading-relaxed">
                        <span className="font-semibold text-stone-700">{t('practice.demo_why_label')}</span>{' '}
                        {t('practice.chord_demo_why')}
                    </p>
                </div>

                {/* The scene: fill the last bar, then play */}
                <div className="relative rounded-[14px] bg-[#F0F0EA] px-4 py-4 select-none overflow-hidden" aria-hidden="true">
                    <div className="relative flex h-[150px] flex-col gap-3">
                        {/* Four bars */}
                        <div className="grid grid-cols-4 gap-2">
                            {BARS.map((chord, i) => (
                                <div
                                    key={i}
                                    className={`cd-bar cd-bar-${i} flex h-[60px] flex-col items-center justify-center rounded-[10px] bg-white/60`}
                                >
                                    <span className="cd-symbol font-serif text-[1.4rem] leading-none text-stone-900">
                                        {chord ?? <span className="cd-fill">F</span>}
                                    </span>
                                    <span className="mt-1 font-sans text-[10px] text-stone-400">
                                        {['I', 'V', 'vi', 'IV'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Three chips, the first is the one taken */}
                        <div className="flex justify-center gap-2">
                            {CHIPS.map((chip, i) => (
                                <span
                                    key={chip}
                                    className={`cd-chip cd-chip-${i} flex h-8 min-w-[2.75rem] items-center justify-center rounded-full bg-[#86BE7F] px-3 font-serif text-sm text-stone-900`}
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>

                        {/* Play, pressed second */}
                        <div className="flex justify-center">
                            <span className="cd-play flex h-8 items-center gap-1.5 rounded-full bg-[#86BE7F] px-4 font-sans text-xs font-semibold text-stone-900">
                                <Play className="h-3 w-3 fill-current stroke-none" />
                                {t('practice.cp_play')}
                            </span>
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for its clicks */}
                    <div className="cd-cursor absolute top-0 left-0 w-5 h-5 pointer-events-none">
                        <span className="cd-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
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
                 *   0–12%   cursor comes in and settles on the F chip
                 *   14%     click — the chip dips, the empty bar fills with F
                 *   16–36%  cursor travels down to Play
                 *   38%     click — playback starts
                 *   40–88%  the four bars light in turn, 12% each
                 *   94%     reset for the next loop
                 *
                 * Cursor x/y are eyeballed against the dialog's ~400px scene,
                 * the same approach the other guides use: the F chip sits at
                 * roughly (150, 82) and Play at (185, 128).
                 */
                .cd-cursor {
                    animation: cd-cursor-path 6s ease-in-out infinite;
                }
                @keyframes cd-cursor-path {
                    0%       { transform: translate(320px, 160px); }
                    12%, 16% { transform: translate(150px, 82px); }
                    36%, 88% { transform: translate(185px, 128px); }
                    100%     { transform: translate(320px, 160px); }
                }
                .cd-cursor svg {
                    animation: cd-cursor-click 6s ease-in-out infinite;
                }
                @keyframes cd-cursor-click {
                    0%, 12%, 16%, 36%, 40%, 100% { transform: scale(1); }
                    14%, 38%                     { transform: scale(0.78); }
                }
                .cd-pulse {
                    opacity: 0;
                    animation: cd-pulse 6s ease-out infinite;
                }
                @keyframes cd-pulse {
                    0%, 13.9%  { opacity: 0; transform: scale(0.4); }
                    14%        { opacity: 0.7; transform: scale(0.4); }
                    22%, 37.9% { opacity: 0; transform: scale(1.7); }
                    38%        { opacity: 0.7; transform: scale(0.4); }
                    46%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /* The chip that gets taken dips on the click */
                .cd-chip-0 {
                    animation: cd-chip-take 6s ease-in-out infinite;
                }
                @keyframes cd-chip-take {
                    0%, 13%, 16%, 100% { transform: scale(1); }
                    14%                { transform: scale(0.9); }
                }

                /* The fourth bar is empty until the click, then holds F */
                .cd-fill {
                    animation: cd-fill 6s step-end infinite;
                }
                @keyframes cd-fill {
                    0%, 13%   { opacity: 0; }
                    14%, 93%  { opacity: 1; }
                    94%, 100% { opacity: 0; }
                }

                /* Play holds its press for the length of the run */
                .cd-play {
                    animation: cd-play 6s step-end infinite;
                }
                @keyframes cd-play {
                    0%, 37%   { background-color: #86BE7F; }
                    38%, 88%  { background-color: #5F9857; }
                    89%, 100% { background-color: #86BE7F; }
                }

                /* Each bar lights for its 12% of the run, in order */
                .cd-bar-0 { animation: cd-bar-0 6s step-end infinite; }
                .cd-bar-1 { animation: cd-bar-1 6s step-end infinite; }
                .cd-bar-2 { animation: cd-bar-2 6s step-end infinite; }
                .cd-bar-3 { animation: cd-bar-3 6s step-end infinite; }
                @keyframes cd-bar-0 {
                    0%, 39%   { background-color: rgba(255,255,255,0.6); }
                    40%, 51%  { background-color: #FBFFED; }
                    52%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes cd-bar-1 {
                    0%, 51%   { background-color: rgba(255,255,255,0.6); }
                    52%, 63%  { background-color: #FBFFED; }
                    64%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes cd-bar-2 {
                    0%, 63%   { background-color: rgba(255,255,255,0.6); }
                    64%, 75%  { background-color: #FBFFED; }
                    76%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes cd-bar-3 {
                    0%, 75%   { background-color: rgba(255,255,255,0.6); }
                    76%, 87%  { background-color: #FBFFED; }
                    88%, 100% { background-color: rgba(255,255,255,0.6); }
                }

                /* Reduced motion: hold the finished state, no cursor */
                @media (prefers-reduced-motion: reduce) {
                    .cd-cursor { display: none; }
                    .cd-chip-0, .cd-fill, .cd-play, .cd-bar { animation: none; }
                    .cd-fill { opacity: 1; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
