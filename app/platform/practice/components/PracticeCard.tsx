"use client";

import { ArrowRight, Play } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import type { PracticeDefinition } from '../data/practices';

interface PracticeCardProps {
    practice: PracticeDefinition;
    /** Translated strings — the card stays free of the language context. */
    name: string;
    goal: string;
    level: string;
    startLabel: string;
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
        <div className="w-full max-w-5xl mx-auto min-h-[62vh] bg-white border border-stone-200 rounded-[28px] p-8 md:p-12 flex flex-col">

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

                {videoUrl && (
                    <Tooltip label={videoLabel}>
                        <button
                            type="button"
                            onClick={onPlayVideo}
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

            {/* Action, bottom right */}
            <div className="mt-auto pt-10 flex justify-end">
                {available ? (
                    <button
                        type="button"
                        onClick={onStart}
                        className="flex items-center gap-3 pl-10 pr-8 py-5 rounded-full bg-stone-900 text-[#FAF9F5] text-lg font-sans font-medium hover:bg-stone-800 active:scale-[0.99] transition-colors"
                    >
                        {startLabel}
                        <ArrowRight size={20} className="stroke-[2]" />
                    </button>
                ) : (
                    <span className="px-10 py-5 rounded-full bg-stone-100 text-stone-400 text-lg font-sans select-none">
                        {comingSoonLabel}
                    </span>
                )}
            </div>
        </div>
    );
}
