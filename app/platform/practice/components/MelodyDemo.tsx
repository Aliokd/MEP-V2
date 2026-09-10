"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Play } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

interface MelodyDemoProps {
    /** Close for now; the guide returns on the next visit. */
    onDone: () => void;
    /** Close and stop auto-appearing. */
    onNeverAgain: () => void;
}

/**
 * The one-step guide shown when Melody is opened.
 *
 * Two of the four steps are just choosing and comparing. What needs showing is
 * the middle: press play and the melody sounds, then press record and play your
 * own version back at it. So the scene is those two controls and nothing else —
 * a cursor takes the green play button, the clip's wave runs, and then it takes
 * the record button below and the wave turns into a take of its own.
 *
 * Same construction as StructureDemo and VerseDemo: everything rides a single
 * six-second CSS timeline, so the cursor, the wave and the button states can
 * never drift apart, and reduced motion gets the finished state as a still.
 */
export default function MelodyDemo({ onDone, onNeverAgain }: MelodyDemoProps) {
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
     * Bar heights as a percentage of the wave's box. Fixed rather than random:
     * a waveform that is different on every open is one nobody drew. Two
     * different shapes so the take reads as an answer to the melody rather than
     * a copy of it — and the take's is the shorter, being a first attempt.
     */
    const MELODY_WAVE = [34, 58, 82, 66, 96, 74, 48, 88, 62, 40, 70, 54, 86, 44, 30];
    const TAKE_WAVE = [26, 44, 70, 92, 58, 36, 78, 50, 66, 30, 84, 42, 60, 38, 24];

    return createPortal(
        // Bottom sheet below md, centred dialog from md up.
        <div data-melody-demo className="fixed inset-0 z-[90] flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px] sheet-backdrop-enter" onClick={onDone} />

            <div className="relative w-full bg-white flex flex-col gap-4 rounded-t-[26px] rounded-b-none border-0 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto no-scrollbar bottom-sheet-enter md:max-w-md md:rounded-[20px] md:border md:border-stone-200/70 md:p-6 md:max-h-none md:overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.18)]" {...swipeHandlers} style={swipeStyle}>
                <div>
                    <h3 className="font-serif font-normal text-2xl text-stone-900">{t('practice.melody_demo_title')}</h3>
                    <p className="mt-2 text-sm font-sans text-stone-500 leading-relaxed">{t('practice.melody_demo_desc')}</p>
                    {/* The how is above; this is the one line on why it is worth doing */}
                    <p className="mt-3 text-sm font-sans text-stone-500 leading-relaxed">
                        <span className="font-semibold text-stone-700">{t('practice.demo_why_label')}</span>{' '}
                        {t('practice.melody_demo_why')}
                    </p>
                </div>

                {/* The scene: listen, then answer */}
                <div className="relative rounded-[14px] bg-[#F0F0EA] px-4 py-4 select-none overflow-hidden" aria-hidden="true">
                    <div className="relative flex h-[132px] flex-col gap-3">
                        {/* The melody, with the play button the cursor takes first */}
                        <div className="flex h-[52px] items-center gap-3 rounded-[12px] bg-white/60 px-3">
                            <span className="md-play flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#86BE7F]">
                                <Play className="h-3.5 w-3.5 translate-x-[1px] fill-stone-900 stroke-none" />
                            </span>
                            <span className="md-wave md-wave-melody flex h-7 flex-1 items-center gap-[3px]">
                                {MELODY_WAVE.map((h, i) => (
                                    <span
                                        key={i}
                                        className="md-bar w-[3px] rounded-full bg-stone-400/70"
                                        style={{ height: `${h}%`, animationDelay: `${i * 26}ms` }}
                                    />
                                ))}
                            </span>
                        </div>

                        {/* Your version, its card arriving with the take */}
                        <div className="md-take flex h-[52px] items-center gap-3 rounded-[12px] px-3">
                            <span className="md-rec flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#86BE7F]">
                                <Mic className="h-3.5 w-3.5 stroke-stone-900 stroke-[2.4]" />
                            </span>
                            <span className="md-wave md-wave-take flex h-7 flex-1 items-center gap-[3px]">
                                {TAKE_WAVE.map((h, i) => (
                                    <span
                                        key={i}
                                        className="md-bar w-[3px] rounded-full bg-stone-400/70"
                                        style={{ height: `${h}%`, animationDelay: `${i * 34}ms` }}
                                    />
                                ))}
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
                 *   0–10%   cursor comes in and settles on the play button
                 *   12%     click — the melody's wave starts moving
                 *   12–42%  it plays
                 *   30–44%  the cursor travels down to the record button
                 *   46%     click — the button goes red, the take card appears
                 *           and its own wave starts
                 *   46–90%  recording, with both cards on screen
                 *   96%     reset for the next loop
                 *
                 * Cursor x/y are eyeballed against the dialog's ~400px scene, the
                 * same approach the other two guides use: the play button sits at
                 * roughly (30, 42), the record button one 52px row plus a 12px
                 * gap below it.
                 */
                .md-cursor {
                    animation: md-cursor-path 6s ease-in-out infinite;
                }
                @keyframes md-cursor-path {
                    0%       { transform: translate(300px, 150px); }
                    10%, 30% { transform: translate(26px, 32px); }
                    44%, 90% { transform: translate(26px, 96px); }
                    100%     { transform: translate(300px, 150px); }
                }
                /* The click dips, one per beat */
                .md-cursor svg {
                    animation: md-cursor-click 6s ease-in-out infinite;
                }
                @keyframes md-cursor-click {
                    0%, 10%, 14%, 44%, 48%, 100% { transform: scale(1); }
                    12%, 46%                     { transform: scale(0.78); }
                }
                .md-pulse {
                    opacity: 0;
                    animation: md-pulse 6s ease-out infinite;
                }
                @keyframes md-pulse {
                    0%, 11.9%  { opacity: 0; transform: scale(0.4); }
                    12%        { opacity: 0.7; transform: scale(0.4); }
                    20%, 45.9% { opacity: 0; transform: scale(1.7); }
                    46%        { opacity: 0.7; transform: scale(0.4); }
                    54%        { opacity: 0; transform: scale(1.7); }
                    100%       { opacity: 0; }
                }

                /*
                 * The bars always wave; what the 6s clock controls is whether
                 * their row is open. Two layers, because a keyframe cannot
                 * reliably pause a neighbouring animation — the first attempt
                 * set animation-play-state from a partner keyframe and both
                 * waves simply ran the whole time.
                 *
                 * So the row itself collapses to a sliver, and the composed
                 * transform (row × bar) takes a 96%-tall bar down to about a
                 * pixel. Flat, and the motion still inside it is far too small
                 * to read as movement.
                 */
                .md-wave {
                    transform-origin: center;
                }
                .md-bar {
                    transform-origin: center;
                    animation: md-wave-bar 0.62s ease-in-out infinite alternate;
                }
                @keyframes md-wave-bar {
                    from { transform: scaleY(0.45); }
                    to   { transform: scaleY(1); }
                }
                .md-wave-melody {
                    animation: md-melody-window 6s ease-in-out infinite;
                }
                @keyframes md-melody-window {
                    0%, 11%   { transform: scaleY(0.07); opacity: 0.5; }
                    14%, 40%  { transform: scaleY(1); opacity: 1; }
                    44%, 100% { transform: scaleY(0.07); opacity: 0.5; }
                }
                .md-wave-take {
                    animation: md-take-window 6s ease-in-out infinite;
                }
                @keyframes md-take-window {
                    0%, 45%   { transform: scaleY(0.07); opacity: 0.5; }
                    48%, 88%  { transform: scaleY(1); opacity: 1; }
                    92%, 100% { transform: scaleY(0.07); opacity: 0.5; }
                }

                /* The take's card is not there until it is recorded */
                .md-take {
                    animation: md-take-card 6s ease-in-out infinite;
                }
                @keyframes md-take-card {
                    0%, 45%   { background-color: rgba(255, 255, 255, 0); opacity: 0.35; }
                    46%, 93%  { background-color: #FBFFED; opacity: 1; }
                    96%, 100% { background-color: rgba(255, 255, 255, 0); opacity: 0.35; }
                }
                /* And its button turns red for the length of the take */
                .md-rec {
                    animation: md-rec-button 6s step-end infinite;
                }
                @keyframes md-rec-button {
                    0%, 45%   { background-color: #86BE7F; }
                    46%, 90%  { background-color: #D45C5C; }
                    91%, 100% { background-color: #86BE7F; }
                }
                /* The play button holds its press for the length of the melody */
                .md-play {
                    animation: md-play-button 6s step-end infinite;
                }
                @keyframes md-play-button {
                    0%, 11%   { background-color: #86BE7F; }
                    12%, 42%  { background-color: #5F9857; }
                    43%, 100% { background-color: #86BE7F; }
                }

                /* Reduced motion: hold the finished state, no cursor, no wave */
                @media (prefers-reduced-motion: reduce) {
                    .md-cursor { display: none; }
                    .md-bar, .md-wave, .md-take, .md-rec, .md-play {
                        animation: none;
                    }
                    .md-bar, .md-wave { transform: scaleY(1); opacity: 1; }
                    .md-take { background-color: #FBFFED; opacity: 1; }
                }
            `}</style>
        </div>,
        document.body,
    );
}
