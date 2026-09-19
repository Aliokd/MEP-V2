"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface RhythmDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
    /**
     * Which practice this is guiding. Rhythm builds a bar from nothing;
     * Developing a rhythm is handed a feel and changes it; Build a beat has
     * the whole kit, five rows. The hits already down are the songwriter's
     * in the first and last and the given feel's in the middle one, and the
     * copy follows; the construction does not change.
     */
    variant?: 'build' | 'develop' | 'beat';
}

/**
 * The one-step guide shown when Rhythm, or Developing a rhythm, is opened.
 *
 * What needs showing is the bar: two rows of sixteen, a square is a hit on a
 * step, tapping puts one there, and play runs the bar round. So the scene is
 * the two rows with a few hits already down, a cursor that adds two more, and
 * a press of play that sweeps the steps left to right.
 *
 * Same construction as the other guides: one six-second CSS timeline drives
 * the cursor, the fills and the sweep, so none can drift from the others, and
 * reduced motion gets the finished state as a still. Every rule is written
 * out by hand: styled-jsx takes an expression as a value inside a rule, never
 * as a rule of its own.
 */
export default function RhythmDemo({ onDone, onNeverAgain, variant = 'build' }: RhythmDemoProps) {
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
     * Hits already down: the high row on every other step, the low row on
     * one and three. The cursor adds a low hit on the "&" of two (step 6) and
     * a high hit on the "a" of four (step 15). Fixed rather than random. In
     * the develop variant the hits already down are the given feel, in the
     * given purple.
     */
    const STEPS = 16;
    const develop = variant === 'develop';
    const beat = variant === 'beat';
    // The beat variant has the kit's five rows, a plain beat already down,
    // and the cursor adding a clap on the four (step 12) and a tom on the
    // last sixteenth (step 15): the two rows the other practices lack.
    const DOWN: Record<string, number[]> = beat
        ? { high: [0, 2, 4, 6, 8, 10, 12, 14], mid: [4, 12], low: [0, 8], clap: [], tom: [] }
        : { high: [0, 2, 4, 8, 10, 12, 14], low: [0, 8] };
    const ADDED: Record<string, number[]> = beat
        ? { high: [], mid: [], low: [], clap: [12], tom: [15] }
        : { high: [15], low: [6] };
    const ROWS: readonly string[] = beat ? ['high', 'mid', 'low', 'clap', 'tom'] : ['high', 'low'];
    const copy = beat ? 'beat_demo' : develop ? 'develop_rhythm_demo' : 'rhythm_demo';

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-rhythm-demo data-rhythm-demo-variant={variant} className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
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
                    <div className={`relative flex flex-col gap-3 ${beat ? 'h-[193px]' : 'h-[118px]'}`}>
                        {/* Two rows of sixteen, the beats grouped by a narrow gap.
                            The playhead rides over the grid. */}
                        <div className="relative">
                            <div
                                className="grid gap-[3px]"
                                style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 0.25rem repeat(4, minmax(0, 1fr)) 0.25rem repeat(4, minmax(0, 1fr)) 0.25rem repeat(4, minmax(0, 1fr))' }}
                            >
                                {ROWS.map(row => Array.from({ length: STEPS }, (_, s) => {
                                    const down = DOWN[row].includes(s);
                                    const added = ADDED[row].includes(s);
                                    const cell = (
                                        <span
                                            key={`${row}-${s}`}
                                            data-step={s}
                                            className={`rd-cell ${added ? `rd-add rd-add-${row}` : ''} h-[22px] rounded-[4px] ${down ? (develop ? 'bg-[#B79DF0]' : 'bg-[#86BE7F]') : 'bg-white/60'}`}
                                        />
                                    );
                                    return s % 4 === 0 && s > 0 ? [<span key={`g-${row}-${s}`} />, cell] : cell;
                                }))}
                            </div>
                            <span className="rd-head pointer-events-none absolute top-0 h-full rounded-[4px] bg-stone-900/10" />
                        </div>

                        {/* Play, pressed after the two taps */}
                        <div className="flex justify-center">
                            <span className="rd-play flex h-8 items-center gap-1.5 rounded-full bg-[#86BE7F] px-4 font-sans text-xs font-semibold text-stone-900">
                                <Play className="h-3 w-3 fill-current stroke-none" />
                                {t('practice.cp_play')}
                            </span>
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for its clicks */}
                    <div className={`${beat ? 'rd-cursor-beat' : 'rd-cursor'} absolute top-0 left-0 w-5 h-5 pointer-events-none`}>
                        <span className="rd-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
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
                 *   0–10%   cursor comes in and settles on the low row, step 7
                 *   12%     click — that square fills
                 *   14–24%  cursor travels to the high row, step 16
                 *   26%     click — that one fills
                 *   28–40%  cursor drops to Play
                 *   42%     click — playback starts
                 *   44–92%  the playhead steps across the sixteen steps, 3% each
                 *   96%     reset for the next loop
                 *
                 * Cursor x/y are eyeballed against the dialog's ~400px scene,
                 * the same approach the other guides use.
                 */
                .rd-cursor {
                    animation: rd-cursor-path 6s ease-in-out infinite;
                }
                @keyframes rd-cursor-path {
                    0%       { transform: translate(320px, 140px); }
                    10%, 14% { transform: translate(150px, 46px); }
                    24%, 28% { transform: translate(352px, 21px); }
                    40%, 92% { transform: translate(185px, 96px); }
                    100%     { transform: translate(320px, 140px); }
                }
                /* The five-row scene: the same beats, the clap row's step 13,
                   the tom row's step 16, and Play three rows further down. */
                .rd-cursor-beat {
                    animation: rd-cursor-path-beat 6s ease-in-out infinite;
                }
                @keyframes rd-cursor-path-beat {
                    0%       { transform: translate(320px, 215px); }
                    10%, 14% { transform: translate(284px, 96px); }
                    24%, 28% { transform: translate(352px, 121px); }
                    40%, 92% { transform: translate(185px, 171px); }
                    100%     { transform: translate(320px, 215px); }
                }
                .rd-cursor svg, .rd-cursor-beat svg {
                    animation: rd-cursor-click 6s ease-in-out infinite;
                }
                @keyframes rd-cursor-click {
                    0%, 10%, 14%, 24%, 28%, 40%, 44%, 100% { transform: scale(1); }
                    12%, 26%, 42%                          { transform: scale(0.78); }
                }
                .rd-pulse {
                    opacity: 0;
                    animation: rd-pulse 6s ease-out infinite;
                }
                @keyframes rd-pulse {
                    0%, 11.9%  { opacity: 0; transform: scale(0.4); }
                    12%        { opacity: 0.7; transform: scale(0.4); }
                    19%, 25.9% { opacity: 0; transform: scale(1.7); }
                    26%        { opacity: 0.7; transform: scale(0.4); }
                    33%, 41.9% { opacity: 0; transform: scale(1.7); }
                    42%        { opacity: 0.7; transform: scale(0.4); }
                    49%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /* Play holds its press for the length of the run */
                .rd-play {
                    animation: rd-play 6s step-end infinite;
                }
                @keyframes rd-play {
                    0%, 41%   { background-color: #86BE7F; }
                    42%, 92%  { background-color: #5F9857; }
                    93%, 100% { background-color: #86BE7F; }
                }

                /*
                 * The playhead: one step wide, stepping across the bar for the
                 * length of the run, 3% a step. A step is a sixteenth of the
                 * width less the three beat-gap columns; each beat past the
                 * first sits one more gap to the right.
                 */
                .rd-head {
                    width: calc((100% - 0.75rem) / 16);
                    opacity: 0;
                    animation: rd-head 6s step-end infinite;
                }
                @keyframes rd-head {
                    0%, 43%   { opacity: 0; left: 0; }
                    44%       { opacity: 1; left: 0; }
                    47%       { left: calc(1 * (100% - 0.75rem) / 16); }
                    50%       { left: calc(2 * (100% - 0.75rem) / 16); }
                    53%       { left: calc(3 * (100% - 0.75rem) / 16); }
                    56%       { left: calc(4 * (100% - 0.75rem) / 16 + 0.25rem); }
                    59%       { left: calc(5 * (100% - 0.75rem) / 16 + 0.25rem); }
                    62%       { left: calc(6 * (100% - 0.75rem) / 16 + 0.25rem); }
                    65%       { left: calc(7 * (100% - 0.75rem) / 16 + 0.25rem); }
                    68%       { left: calc(8 * (100% - 0.75rem) / 16 + 0.5rem); }
                    71%       { left: calc(9 * (100% - 0.75rem) / 16 + 0.5rem); }
                    74%       { left: calc(10 * (100% - 0.75rem) / 16 + 0.5rem); }
                    77%       { left: calc(11 * (100% - 0.75rem) / 16 + 0.5rem); }
                    80%       { left: calc(12 * (100% - 0.75rem) / 16 + 0.75rem); }
                    83%       { left: calc(13 * (100% - 0.75rem) / 16 + 0.75rem); }
                    86%       { left: calc(14 * (100% - 0.75rem) / 16 + 0.75rem); }
                    89%       { left: calc(15 * (100% - 0.75rem) / 16 + 0.75rem); }
                    92%, 100% { opacity: 0; left: calc(15 * (100% - 0.75rem) / 16 + 0.75rem); }
                }

                /* The two squares the cursor fills, each on its click */
                .rd-add-low  { animation: rd-add-low 6s step-end infinite; }
                .rd-add-high { animation: rd-add-high 6s step-end infinite; }
                @keyframes rd-add-low {
                    0%, 11%   { background-color: rgba(255,255,255,0.6); }
                    12%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes rd-add-high {
                    0%, 25%   { background-color: rgba(255,255,255,0.6); }
                    26%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                /* The beat variant's two: the clap on the first click, the tom on the second */
                .rd-add-clap { animation: rd-add-clap 6s step-end infinite; }
                .rd-add-tom  { animation: rd-add-tom 6s step-end infinite; }
                @keyframes rd-add-clap {
                    0%, 11%   { background-color: rgba(255,255,255,0.6); }
                    12%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }
                @keyframes rd-add-tom {
                    0%, 25%   { background-color: rgba(255,255,255,0.6); }
                    26%, 95%  { background-color: #86BE7F; }
                    96%, 100% { background-color: rgba(255,255,255,0.6); }
                }

                /* Reduced motion: hold the finished state, no cursor, no playhead */
                @media (prefers-reduced-motion: reduce) {
                    .rd-cursor, .rd-cursor-beat, .rd-head { display: none; }
                    .rd-cell, .rd-play { animation: none; }
                    .rd-add { background-color: #86BE7F; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
