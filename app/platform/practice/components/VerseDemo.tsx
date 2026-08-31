"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface VerseDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
}

/**
 * The one-step guide shown before a first-timer's first Composing verses run.
 *
 * The practice has six steps, but five of them are typing into labelled fields —
 * nothing to teach. The one moment that needs showing is the linking step, where
 * clicking a noun and then a verb draws a line between them, so that is the
 * whole scene: two tinted columns, a cursor that makes two pairs, and the lines
 * arriving as each pair lands.
 *
 * Same construction as StructureDemo next door: everything rides a single
 * six-second CSS timeline so the cursor, the fills and the line-draws can never
 * drift apart, and reduced motion gets the linked end-state as a still. The
 * word cards are ghost bars rather than words so the scene needs no
 * translation; the verb column wears the same #FBFFED tint as the real step.
 */
export default function VerseDemo({ onDone, onNeverAgain }: VerseDemoProps) {
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

    /* Ghost-bar widths, % of the pill. Varied so the columns read as words
       of different lengths rather than as a table of identical rows. */
    const NOUNS = [62, 48, 70];
    const VERBS = [54, 66, 44];

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-verse-demo className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px] sheet-backdrop-enter" onClick={onDone} />

            <div className="relative w-full bg-white flex flex-col gap-4 rounded-t-[26px] rounded-b-none border-0 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto no-scrollbar bottom-sheet-enter md:max-w-md md:rounded-[20px] md:border md:border-stone-200/70 md:p-6 md:max-h-none md:overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.18)]" {...swipeHandlers} style={swipeStyle}>
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t('practice.verse_demo_title')}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t('practice.verse_demo_desc')}</p>
                </div>

                {/* The scene: the linking step in miniature */}
                <div className="relative rounded-[14px] bg-[#F0F0EA] px-4 py-4 select-none overflow-hidden" aria-hidden="true">
                    {/* Two columns of word pills; the lines live on an overlay that
                        shares this container's box, so their endpoints can be
                        written against the same row arithmetic as the pills:
                        28px a row, 10px between, centres at 14 / 52 / 90. */}
                    <div className="relative h-[104px]">
                        <div className="absolute inset-y-0 left-0 flex w-[34%] flex-col gap-2.5">
                            {NOUNS.map((w, i) => (
                                <div key={i} className={`vd-noun-${i} flex h-7 items-center rounded-[9px] bg-white/60 px-2.5`}>
                                    <span className="block h-[5px] rounded bg-stone-400/70" style={{ width: `${w}%` }} />
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-y-0 right-0 flex w-[34%] flex-col gap-2.5">
                            {VERBS.map((w, i) => (
                                <div key={i} className={`vd-verb-${i} flex h-7 items-center rounded-[9px] bg-[#FBFFED] px-2.5`}>
                                    <span className="block h-[5px] rounded bg-stone-400/70" style={{ width: `${w}%` }} />
                                </div>
                            ))}
                        </div>

                        {/* The connectors, drawn as each pair lands. pathLength=1
                            makes the dash arithmetic unit-length, so the draw is
                            one offset going 1 → 0 regardless of the line's real
                            length; percentage x, pixel y — both against this box. */}
                        <svg className="pointer-events-none absolute inset-0 h-full w-full">
                            <line className="vd-line-1" x1="35%" y1="14" x2="65%" y2="52" pathLength={1} stroke="#1C1917" strokeWidth="1.4" strokeOpacity="0.45" strokeDasharray="1" />
                            <line className="vd-line-2" x1="35%" y1="52" x2="65%" y2="14" pathLength={1} stroke="#1C1917" strokeWidth="1.4" strokeOpacity="0.45" strokeDasharray="1" />
                        </svg>
                    </div>

                    {/* The cursor, with a pulse ring for its clicks */}
                    <div className="vd-cursor absolute top-0 left-0 w-5 h-5 pointer-events-none">
                        <span className="vd-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
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
                 *   0–12%   cursor comes in and settles on the first noun
                 *   14%     click — the noun arms (deep beige, as in the real step)
                 *   16–28%  across to the second verb
                 *   30%     click — line 1 draws, both cards fill green
                 *   34–44%  down to the second noun
                 *   46%     click — it arms
                 *   48–58%  across to the first verb
                 *   60%     click — line 2 draws, the crossing pair fills green
                 *   60–92%  the linked state holds
                 *   96%     reset for the next loop
                 *
                 * Cursor x is written against the dialog's ~400px scene; the same
                 * eyeballed-px approach StructureDemo uses. y rows: pills sit at
                 * 16 + {0,38,76} within the scene, centres ~30/68/106 scene-space.
                 */
                .vd-cursor {
                    animation: vd-cursor-path 6s ease-in-out infinite;
                }
                @keyframes vd-cursor-path {
                    0%        { transform: translate(300px, 150px); }
                    12%, 16%  { transform: translate(78px, 26px); }
                    28%, 34%  { transform: translate(268px, 64px); }
                    44%, 48%  { transform: translate(78px, 64px); }
                    58%, 92%  { transform: translate(268px, 26px); }
                    100%      { transform: translate(300px, 150px); }
                }
                /* The click dips, one per beat */
                .vd-cursor svg {
                    animation: vd-cursor-click 6s ease-in-out infinite;
                }
                @keyframes vd-cursor-click {
                    0%, 100%           { transform: scale(1); }
                    12%, 16%, 28%, 34%, 44%, 48%, 58%, 62% { transform: scale(1); }
                    14%, 30%, 46%, 60% { transform: scale(0.78); }
                }
                .vd-pulse {
                    opacity: 0;
                    animation: vd-pulse 6s ease-out infinite;
                }
                @keyframes vd-pulse {
                    0%, 13.9%  { opacity: 0; transform: scale(0.4); }
                    14%        { opacity: 0.7; transform: scale(0.4); }
                    20%, 29.9% { opacity: 0; transform: scale(1.7); }
                    30%        { opacity: 0.7; transform: scale(0.4); }
                    36%, 45.9% { opacity: 0; transform: scale(1.7); }
                    46%        { opacity: 0.7; transform: scale(0.4); }
                    52%, 59.9% { opacity: 0; transform: scale(1.7); }
                    60%        { opacity: 0.7; transform: scale(0.4); }
                    66%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /* First pair: noun 1 arms on its click, greens when the verb lands */
                .vd-noun-0 {
                    animation: vd-first-noun 6s ease-in-out infinite;
                }
                @keyframes vd-first-noun {
                    0%, 13%   { background-color: rgba(255, 255, 255, 0.6); }
                    14%, 29%  { background-color: #DCDDD4; }
                    30%, 93%  { background-color: rgba(134, 190, 127, 0.85); }
                    96%, 100% { background-color: rgba(255, 255, 255, 0.6); }
                }
                .vd-verb-1 {
                    animation: vd-first-verb 6s ease-in-out infinite;
                }
                @keyframes vd-first-verb {
                    0%, 29%   { background-color: #FBFFED; }
                    30%, 93%  { background-color: rgba(134, 190, 127, 0.85); }
                    96%, 100% { background-color: #FBFFED; }
                }
                /* Second pair, crossing the first */
                .vd-noun-1 {
                    animation: vd-second-noun 6s ease-in-out infinite;
                }
                @keyframes vd-second-noun {
                    0%, 45%   { background-color: rgba(255, 255, 255, 0.6); }
                    46%, 59%  { background-color: #DCDDD4; }
                    60%, 93%  { background-color: rgba(134, 190, 127, 0.85); }
                    96%, 100% { background-color: rgba(255, 255, 255, 0.6); }
                }
                .vd-verb-0 {
                    animation: vd-second-verb 6s ease-in-out infinite;
                }
                @keyframes vd-second-verb {
                    0%, 59%   { background-color: #FBFFED; }
                    60%, 93%  { background-color: rgba(134, 190, 127, 0.85); }
                    96%, 100% { background-color: #FBFFED; }
                }

                /* The lines draw from the noun toward the verb as each pair lands */
                .vd-line-1 {
                    animation: vd-line-1 6s ease-in-out infinite;
                }
                @keyframes vd-line-1 {
                    0%, 29.9% { opacity: 0; stroke-dashoffset: 1; }
                    30%       { opacity: 1; stroke-dashoffset: 1; }
                    36%, 93%  { opacity: 1; stroke-dashoffset: 0; }
                    96%, 100% { opacity: 0; stroke-dashoffset: 1; }
                }
                .vd-line-2 {
                    animation: vd-line-2 6s ease-in-out infinite;
                }
                @keyframes vd-line-2 {
                    0%, 59.9% { opacity: 0; stroke-dashoffset: 1; }
                    60%       { opacity: 1; stroke-dashoffset: 1; }
                    66%, 93%  { opacity: 1; stroke-dashoffset: 0; }
                    96%, 100% { opacity: 0; stroke-dashoffset: 1; }
                }

                /* Reduced motion: hold the linked state, no cursor, no drawing */
                @media (prefers-reduced-motion: reduce) {
                    .vd-cursor { display: none; }
                    .vd-noun-0, .vd-noun-1, .vd-verb-0, .vd-verb-1,
                    .vd-line-1, .vd-line-2 {
                        animation: none;
                    }
                    .vd-noun-0, .vd-noun-1, .vd-verb-0, .vd-verb-1 {
                        background-color: rgba(134, 190, 127, 0.85) !important;
                    }
                    .vd-line-1, .vd-line-2 {
                        opacity: 1;
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>,
        document.body,
    );
}
