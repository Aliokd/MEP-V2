"use client";

import { ArrowRight, Play } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import PracticeIllustration from './PracticeIllustration';
import type { PracticeDefinition } from '../data/practices';

interface PracticeCardProps {
    practice: PracticeDefinition;
    /** Translated strings — the card stays free of the language context. */
    name: string;
    goal: string;
    level: string;
    startLabel: string;
    /** For unbuilt practices: "Coming in 14 days" (or plain "Coming soon"). */
    comingSoonLabel: string;
    /** Names the intro clip, e.g. "Why Master song structure?". */
    videoLabel: string;
    onStart: () => void;
    onPlayVideo: () => void;
}

export default function PracticeCard({
    practice,
    name,
    goal,
    level,
    startLabel,
    comingSoonLabel,
    videoLabel,
    onStart,
    onPlayVideo,
}: PracticeCardProps) {
    const { available, videoUrl } = practice;

    return (
        // Sized against the viewport rather than a flex parent: the practice page
        // is a plain scrolling column, so there is no height here to inherit. The
        // subtracted rem account for the platform header, panel padding and the
        // practice selector sitting above the card.
        <div
            onClick={available ? onStart : undefined}
            className={`w-full max-w-5xl mx-auto min-h-[62vh] md:min-h-[calc(100vh-14rem)] bg-[#FAF9F5] border border-stone-200 rounded-[28px] p-8 md:p-12 flex flex-col
                ${available ? 'cursor-pointer hover:border-stone-300 transition-colors' : ''}`}
        >

            {/* Title row — the intro clip sits opposite the title */}
            <div className="flex items-start justify-between gap-6">
                <div className="flex flex-col gap-4">
                    <span className="self-start bg-stone-100 text-stone-500 rounded-full px-3 py-1 text-xs font-sans">
                        {level}
                    </span>
                    <h2 className="font-serif font-normal text-3xl md:text-4xl text-stone-900 leading-snug">
                        {name}
                    </h2>
                </div>

                {/* The intro clip belongs to a practice you can actually start */}
                {available && videoUrl && (
                    <Tooltip label={videoLabel}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPlayVideo(); }}
                            aria-label={videoLabel}
                            className="w-14 h-14 shrink-0 rounded-full border border-stone-300 hover:border-stone-500 hover:bg-stone-50 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                        >
                            <Play className="w-5 h-5 fill-stone-900 text-stone-900 stroke-none ml-0.5" />
                        </button>
                    </Tooltip>
                )}
            </div>

            <p className="mt-5 text-base text-stone-500 font-sans leading-relaxed max-w-xl">
                {goal}
            </p>

            {/* Bottom row: the practice's illustration on the left, the action on the
                right. Unbuilt practices stay bare — the visual arrives with the work. */}
            {/* flex-col-reverse on a phone puts Start directly under the goal and the
                illustration below it, so the action is on screen without scrolling —
                at md's row layout it sat past the bottom of a 288px illustration that
                mt-auto had already pushed to the end of a 62vh card. */}
            <div className="mt-6 pt-0 flex flex-col-reverse items-stretch gap-5 md:mt-auto md:pt-10 md:flex-row md:items-end md:justify-between md:gap-6">
                {available ? (
                    <PracticeIllustration
                        name={practice.name}
                        className="w-56 h-56 md:w-96 md:h-96 text-stone-800 opacity-60 shrink-0 self-center md:self-auto -ml-0 md:-ml-6 -mb-6 select-none"
                    />
                ) : (
                    <span aria-hidden="true" />
                )}

                {available ? (
                    <button
                        type="button"
                        onClick={onStart}
                        className="w-full md:w-auto justify-center md:justify-start flex items-center gap-3 px-8 md:pl-10 md:pr-8 h-16 md:h-auto md:py-5 rounded-full bg-stone-900 text-[#FAF9F5] text-lg font-sans font-medium hover:bg-stone-800 active:scale-[0.99] transition-colors"
                    >
                        {startLabel}
                        <ArrowRight size={20} className="stroke-[2]" />
                    </button>
                ) : (
                    <span className="shrink-0 select-none px-10 py-5 rounded-full bg-[#FDE047] text-stone-900 text-lg font-sans tabular-nums">
                        {comingSoonLabel}
                    </span>
                )}
            </div>
        </div>
    );
}
