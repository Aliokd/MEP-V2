"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { KIND_BG, SOLVED_BG, TAG_BG } from '../data/sections';
import * as btn from '@/app/platform/components/buttonStyles';

interface StructureDemoProps {
    onDone: () => void;
}

/**
 * The one-step guide shown before a first-timer's first exercise: a looped
 * miniature of the real thing. A section is named and its band pulses; the
 * cursor scrolls down the lyrics, passing card after card, and clicks the one
 * that matches — card and band fill green together.
 *
 * Everything rides a single six-second CSS timeline, so the cursor, the scroll
 * and the fills can never drift apart. Reduced motion gets the solved
 * end-state as a still.
 */
export default function StructureDemo({ onDone }: StructureDemoProps) {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
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
     * Four ghost parts; the third is the answer. Line counts differ so the cards
     * stand at different heights, the way real verses and choruses do — a stack
     * of identical boxes reads as a loading skeleton, not as lyrics. Every line
     * is the same weight; only the widths and the counts vary.
     *
     * Heights follow from the counts: 5px a line, 6px between, 20px of padding.
     * The scroll keyframes below are written against those numbers.
     */
    const CARDS = [
        [70, 52],
        [62, 78, 45, 58],
        [58, 74, 46],
        [66, 50],
    ];

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-structure-demo className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px] sheet-backdrop-enter" onClick={onDone} />

            <div className="relative w-full bg-white flex flex-col gap-4 rounded-t-[26px] rounded-b-none border-0 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto no-scrollbar bottom-sheet-enter md:max-w-md md:rounded-[20px] md:border md:border-stone-200/70 md:p-6 md:max-h-none md:overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t('practice.demo_title')}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t('practice.demo_desc')}</p>
                </div>

                {/* The scene: a miniature of the exercise itself */}
                <div className="demo-scene relative rounded-[14px] bg-[#F0F0EA] px-4 pt-3 pb-4 select-none overflow-hidden" aria-hidden="true">
                    {/* The ask, pointing at the band it refers to */}
                    <div className="relative h-6">
                        <span className="absolute left-[27%] -translate-x-1/2 flex flex-col items-center">
                            <span className="rounded-full bg-stone-900 text-[#FAF9F5] px-2.5 py-[3px] text-[9px] leading-none whitespace-nowrap">
                                {`${t('practice.find_section').replace('{section}', t('practice.section_verse'))} 1`}
                            </span>
                            <svg width="9" height="5" viewBox="0 0 9 5" className="-mt-px">
                                <path d="M4.5 5 L9 0 H0 Z" fill="#1C1917" />
                            </svg>
                        </span>
                    </div>

                    {/* Mini timeline. The band being asked for is the black one;
                        the rest keep their colour, divided by the same gaps. */}
                    <div className="flex h-7 mt-0.5">
                        <div style={{ backgroundColor: KIND_BG.intro, width: '14%' }} />
                        <div className="demo-band relative z-10 border-l-2 border-[#F0F0EA]" style={{ backgroundColor: '#1C1917', width: '26%' }} />
                        <div className="border-l-2 border-[#F0F0EA]" style={{ backgroundColor: KIND_BG.chorus, width: '30%' }} />
                        <div className="border-l-2 border-[#F0F0EA]" style={{ backgroundColor: KIND_BG.verse, width: '30%' }} />
                    </div>

                    {/* The lyrics, in their own scroll viewport */}
                    <div className="relative mt-3 h-[92px] overflow-hidden">
                        <div className="demo-list absolute inset-x-0 top-0 flex flex-col gap-2">
                            {CARDS.map((lines, i) => (
                                // No fixed height: each card stands as tall as its lines
                                <div
                                    key={i}
                                    className={`${i === 2 ? 'demo-answer' : ''} relative rounded-[10px] bg-white/60 px-3 py-2.5 flex flex-col justify-center gap-1.5`}
                                >
                                    {i === 2 && (
                                        <span
                                            className="demo-tag absolute top-1.5 right-2 rounded-full px-1.5 py-[1px] flex items-center"
                                            style={{ backgroundColor: TAG_BG }}
                                        >
                                            <Check size={7} className="stroke-[3] text-stone-700" />
                                        </span>
                                    )}
                                    {lines.map((w, j) => (
                                        <span
                                            key={j}
                                            className={`${i === 2 ? 'demo-answer-line' : ''} block h-[5px] rounded bg-stone-300/70`}
                                            style={{ width: `${w}%` }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for its click */}
                    <div className="demo-cursor absolute top-0 left-0 w-5 h-5 pointer-events-none">
                        <span className="demo-pulse absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-stone-900/40" />
                        <svg width="16" height="16" viewBox="0 0 24 24" className="drop-shadow-sm">
                            <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#1C1917" stroke="#FFFFFF" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onDone}
                    // Full width and thumb-height on the sheet; the right-aligned pill
                    // it is on desktop only works when there is a dialog edge to align to.
                    className={`${btn.primary('touch')} w-full md:w-auto md:self-end cursor-pointer`}
                >
                    {t('studio_banner.got_it')}
                </button>
            </div>

            <style jsx>{`
                /*
                 * One shared 6s clock. Beats:
                 *   0–12%   cursor comes in from the bottom right
                 *   12–46%  it works down the lyrics while the list scrolls twice
                 *   50%     it settles on the third card
                 *   55%     the click — card and band fill green, the tag ticks
                 *   55–92%  the solved state holds
                 *   96%     reset for the next loop
                 */
                .demo-cursor {
                    animation: demo-cursor-path 6s ease-in-out infinite;
                }
                /*
                 * The cursor's y follows where each card actually sits as the list
                 * scrolls: card 1 at ~90, the tall card 2 at ~105, the answer at ~98.
                 */
                @keyframes demo-cursor-path {
                    0%       { transform: translate(250px, 152px); }
                    12%      { transform: translate(150px, 90px); }
                    28%      { transform: translate(128px, 105px); }
                    44%      { transform: translate(112px, 98px); }
                    50%, 92% { transform: translate(104px, 98px); }
                    100%     { transform: translate(250px, 152px); }
                }
                /* The click dip */
                .demo-cursor svg {
                    animation: demo-cursor-click 6s ease-in-out infinite;
                }
                @keyframes demo-cursor-click {
                    0%, 52%, 60%, 100% { transform: scale(1); }
                    55%                { transform: scale(0.78); }
                }
                .demo-pulse {
                    opacity: 0;
                    animation: demo-pulse 6s ease-out infinite;
                }
                @keyframes demo-pulse {
                    0%, 54.9% { opacity: 0; transform: scale(0.4); }
                    55%       { opacity: 0.7; transform: scale(0.4); }
                    64%       { opacity: 0; transform: scale(1.7); }
                    100%      { opacity: 0; }
                }

                /* The list scrolls past two cards before the answer is reached */
                .demo-list {
                    animation: demo-scroll 6s ease-in-out infinite;
                }
                /*
                 * Offsets are the cards' own tops, not a fixed pitch: 36 + 8 puts
                 * card 2 at 44, and + 58 + 8 puts the answer at 110. Change a card's
                 * line count and these have to move with it.
                 */
                @keyframes demo-scroll {
                    0%, 10%   { transform: translateY(0); }
                    28%       { transform: translateY(-44px); }
                    44%, 93%  { transform: translateY(-110px); }
                    100%      { transform: translateY(0); }
                }

                /* The band being asked for: solid black and pulsing, then green */
                .demo-band {
                    animation: demo-band 6s ease-in-out infinite;
                }
                @keyframes demo-band {
                    0%, 54%   { background-color: #1C1917; transform: scale(1); }
                    27%       { background-color: #1C1917; transform: scale(1.14); }
                    55%, 93%  { background-color: ${SOLVED_BG}; transform: scale(1); }
                    96%, 100% { background-color: #1C1917; transform: scale(1); }
                }
                /* The answering card fills green under the cursor */
                .demo-answer {
                    animation: demo-answer 6s ease-in-out infinite;
                }
                @keyframes demo-answer {
                    0%, 54%  { background-color: rgba(255, 255, 255, 0.6); }
                    55%, 93% { background-color: ${SOLVED_BG}; }
                    96%, 100% { background-color: rgba(255, 255, 255, 0.6); }
                }
                .demo-answer-line {
                    animation: demo-answer-line 6s ease-in-out infinite;
                }
                @keyframes demo-answer-line {
                    0%, 54%   { background-color: rgba(214, 211, 209, 0.7); }
                    55%, 93%  { background-color: rgba(28, 43, 26, 0.35); }
                    96%, 100% { background-color: rgba(214, 211, 209, 0.7); }
                }
                /* Its name arrives with the fill */
                .demo-tag {
                    opacity: 0;
                    animation: demo-tag 6s ease-in-out infinite;
                }
                @keyframes demo-tag {
                    0%, 54%   { opacity: 0; }
                    55%, 93%  { opacity: 1; }
                    96%, 100% { opacity: 0; }
                }

                /* Reduced motion: hold the solved state, no cursor, no scrolling */
                @media (prefers-reduced-motion: reduce) {
                    .demo-cursor { display: none; }
                    .demo-list, .demo-band, .demo-answer, .demo-answer-line, .demo-tag {
                        animation: none;
                    }
                    .demo-list { transform: translateY(-110px); }
                    .demo-band { background-color: ${SOLVED_BG} !important; }
                    .demo-answer { background-color: ${SOLVED_BG} !important; }
                    .demo-tag { opacity: 1; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
