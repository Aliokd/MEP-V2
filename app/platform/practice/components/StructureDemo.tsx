"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { KIND_BG, SECTION_TEXT, SOLVED_BG } from '../data/sections';

interface StructureDemoProps {
    onDone: () => void;
}

/**
 * The one-step guide shown before a first-timer's first exercise: a five-second
 * looped scene of a cursor arming "Verse" on the timeline, answering with the
 * lyrics card, and both filling green. Everything rides a single 5s CSS
 * timeline, so the cursor, the ring and the fills can never drift apart.
 * Reduced motion gets the solved end-state as a still.
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

    return createPortal(
        <div data-structure-demo className="fixed inset-0 z-[90] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px]" onClick={onDone} />

            <div className="relative w-full max-w-md bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-stone-200/70 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t('practice.demo_title')}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t('practice.demo_desc')}</p>
                </div>

                {/* The scene: a miniature of the exercise itself */}
                <div className="demo-scene relative rounded-[14px] bg-[#F0F0EA] px-4 pt-4 pb-4 select-none overflow-hidden" aria-hidden="true">
                    {/* Mini timeline */}
                    <div className="flex h-8 overflow-hidden">
                        <div style={{ backgroundColor: KIND_BG.intro, width: '14%' }} />
                        <div
                            className="demo-band flex items-center justify-center text-[10px] font-sans"
                            style={{ backgroundColor: KIND_BG.verse, width: '34%', color: SECTION_TEXT }}
                        >
                            {t('practice.section_verse')}
                        </div>
                        <div
                            className="flex items-center justify-center text-[10px] font-sans"
                            style={{ backgroundColor: KIND_BG.chorus, width: '26%', color: SECTION_TEXT }}
                        >
                            {t('practice.section_chorus')}
                        </div>
                        <div style={{ backgroundColor: KIND_BG.verse, width: '26%' }} />
                    </div>

                    {/* Mini lyrics card, ghost lines standing in for words */}
                    <div className="demo-card relative mt-3 rounded-[12px] bg-white/70 px-4 py-3.5">
                        <span className="demo-chip absolute top-2.5 right-2.5 w-6 h-5 rounded-full bg-[#E4E4DF] flex items-center justify-center text-[10px] text-stone-500">
                            <span className="demo-chip-q">?</span>
                            <Check size={10} className="demo-chip-check absolute stroke-[3]" style={{ color: '#1C2B1A' }} />
                        </span>
                        <div className="space-y-2 py-0.5">
                            <div className="demo-line h-2 rounded bg-stone-300/70 w-3/5" />
                            <div className="demo-line h-2 rounded bg-stone-300/70 w-4/5" />
                            <div className="demo-line h-2 rounded bg-stone-300/70 w-1/2" />
                        </div>
                    </div>

                    {/* The cursor, with a pulse ring for each click */}
                    <div className="demo-cursor absolute top-0 left-0 w-6 h-6 pointer-events-none">
                        <span className="demo-pulse absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-stone-900/40" />
                        <svg width="18" height="18" viewBox="0 0 24 24" className="drop-shadow-sm">
                            <path d="M5 3l14 8-6.5 1.5L9 19z" fill="#1C1917" stroke="#FFFFFF" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onDone}
                    className="self-end px-8 py-3 rounded-full bg-stone-900 text-[#FAF9F5] text-sm font-sans font-medium hover:bg-stone-800 active:scale-[0.98] transition-all cursor-pointer"
                >
                    {t('studio_banner.got_it')}
                </button>
            </div>

            <style jsx>{`
                /*
                 * One shared 5s clock. Beats:
                 *   14%  cursor reaches the Verse band
                 *   20%  click 1 — the band arms
                 *   48%  cursor reaches the lyrics card
                 *   54%  click 2 — card and band fill green
                 *   88%  hold the solved state
                 *   100% reset for the next loop
                 */
                .demo-cursor {
                    animation: demo-cursor-path 5s ease-in-out infinite;
                }
                @keyframes demo-cursor-path {
                    0%       { transform: translate(300px, 130px); }
                    14%, 26% { transform: translate(96px, 22px); }
                    48%, 90% { transform: translate(120px, 96px); }
                    100%     { transform: translate(300px, 130px); }
                }
                /* The click dips */
                .demo-cursor svg {
                    animation: demo-cursor-click 5s ease-in-out infinite;
                }
                @keyframes demo-cursor-click {
                    0%, 18%, 26%, 52%, 60%, 100% { transform: scale(1); }
                    20%, 54% { transform: scale(0.78); }
                }
                .demo-pulse {
                    opacity: 0;
                    animation: demo-pulse 5s ease-out infinite;
                }
                @keyframes demo-pulse {
                    0%, 19.9% { opacity: 0; transform: scale(0.4); }
                    20%       { opacity: 0.7; transform: scale(0.4); }
                    28%       { opacity: 0; transform: scale(1.6); }
                    53.9%     { opacity: 0; transform: scale(0.4); }
                    54%       { opacity: 0.7; transform: scale(0.4); }
                    62%       { opacity: 0; transform: scale(1.6); }
                    100%      { opacity: 0; }
                }
                /* Verse band: armed ring after click 1, green after click 2 */
                .demo-band {
                    animation: demo-band 5s linear infinite;
                }
                @keyframes demo-band {
                    0%, 19% { box-shadow: none; background-color: ${KIND_BG.verse}; }
                    20%, 53% { box-shadow: inset 0 0 0 2px #8c8878; background-color: ${KIND_BG.verse}; }
                    54%, 92% { box-shadow: none; background-color: ${SOLVED_BG}; }
                    96%, 100% { box-shadow: none; background-color: ${KIND_BG.verse}; }
                }
                /* The lyrics card fills green on click 2 */
                .demo-card {
                    animation: demo-part 5s linear infinite;
                }
                @keyframes demo-part {
                    0%, 53% { background-color: rgba(255, 255, 255, 0.7); }
                    54%, 92% { background-color: ${SOLVED_BG}; }
                    96%, 100% { background-color: rgba(255, 255, 255, 0.7); }
                }
                .demo-line {
                    animation: demo-line 5s linear infinite;
                }
                @keyframes demo-line {
                    0%, 53% { background-color: rgba(214, 211, 209, 0.7); }
                    54%, 92% { background-color: rgba(28, 43, 26, 0.35); }
                    96%, 100% { background-color: rgba(214, 211, 209, 0.7); }
                }
                /* The "?" chip becomes a check while solved */
                .demo-chip-check { opacity: 0; animation: demo-check 5s linear infinite; }
                .demo-chip-q { animation: demo-q 5s linear infinite; }
                @keyframes demo-check {
                    0%, 53% { opacity: 0; }
                    54%, 92% { opacity: 1; }
                    96%, 100% { opacity: 0; }
                }
                @keyframes demo-q {
                    0%, 53% { opacity: 1; }
                    54%, 92% { opacity: 0; }
                    96%, 100% { opacity: 1; }
                }

                /* Reduced motion: freeze on the solved state, no cursor */
                @media (prefers-reduced-motion: reduce) {
                    .demo-cursor { display: none; }
                    .demo-band, .demo-card, .demo-line, .demo-chip-q, .demo-chip-check {
                        animation: none;
                    }
                    .demo-band { background-color: ${SOLVED_BG} !important; }
                    .demo-card { background-color: ${SOLVED_BG} !important; }
                    .demo-chip-q { opacity: 0; }
                    .demo-chip-check { opacity: 1; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
