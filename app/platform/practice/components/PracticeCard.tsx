"use client";

import { ArrowRight, Play } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import PracticeIllustration from './PracticeIllustration';
import type { PracticeDefinition } from '../data/practices';
import * as btn from '@/app/platform/components/buttonStyles';

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
                            className={`${btn.icon('lg')} cursor-pointer`}
                        >
                            <Play className="w-5 h-5 fill-stone-900 text-stone-900 stroke-none ml-0.5" />
                        </button>
                    </Tooltip>
                )}
            </div>

            {/* Lifted above the illustration, which now rides up under it on a phone.
                DOM order paints the artwork last, so without this the 60%-opacity
                mark would wash over the words instead of sitting behind them. */}
            <p className="relative z-10 mt-5 text-base text-stone-500 font-sans leading-relaxed max-w-xl">
                {goal}
            </p>

            {/* Bottom row: the practice's illustration on the left, the action on the
                right. Unbuilt practices stay bare — the visual arrives with the work. */}
            {/* On a phone this is a column in reading order — illustration, then the
                action beneath it — pushed to the card's floor by mt-auto so Start
                lands where a thumb already is. It briefly ran reversed, with Start
                tucked under the goal, back when a 288px illustration sat between the
                two; the illustration is 192px here now, so the honest order fits. */}
            <div className="mt-auto pt-0 flex flex-col items-stretch gap-4 md:pt-10 md:flex-row md:items-end md:justify-between md:gap-6">
                {available ? (
                    <PracticeIllustration
                        name={practice.name}
                        // Sized off the viewport on a phone, not a fixed rem: this is the
                        // card's one piece of artwork and at 192px it read as a thumbnail
                        // marooned in the middle of the card. The negative top margin lets
                        // it ride up under the goal text — the illustration is a pale
                        // 60%-opacity mark with a soft edge, so a few px of overlap reads
                        // as depth rather than collision. pointer-events-none keeps it from
                        // stealing taps from the text it now sits over.
                        className="w-[calc(100%+4rem)] max-w-[420px] aspect-square h-auto md:w-96 md:h-96 md:max-w-none text-stone-800 opacity-60 shrink-0 self-center md:self-auto -ml-0 md:-ml-6 -mt-12 md:mt-0 -mb-2 md:-mb-6 select-none pointer-events-none md:pointer-events-auto"
                    />
                ) : (
                    <span aria-hidden="true" />
                )}

                {available ? (
                    <button
                        type="button"
                        onClick={onStart}
                        className={`${btn.primary('hero')} w-full md:w-auto`}
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
