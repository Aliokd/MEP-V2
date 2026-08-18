"use client";

import React from 'react';
import { X, Heart, Check } from 'lucide-react';
import type { CanvasTip } from '@/lib/canvasTips';

interface TipCapsuleCardProps {
    tip: CanvasTip;
    onDelete: () => void;
    deleteLabel: string;
    whyLabel: string;
    /** Favourite/tick state, shared with Learn — see lib/tipMarks. */
    liked: boolean;
    checked: boolean;
    likeLabel: string;
    checkLabel: string;
    onToggleLike: () => void;
    onToggleCheck: () => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
}

/**
 * A Bank of tips card sitting in the lyric flow.
 *
 * Same capsule as the image and document cards — white, 32px radius, capped at
 * 440px — so a tip reads as one of the canvas's own cards rather than something
 * imported. The × sits in the top right rather than in a control bar because a
 * tip has nothing to rename or scan: dismissing it is the only action, and it is
 * something writers do often once the tip has done its job.
 */
export default function TipCapsuleCard({
    tip,
    onDelete,
    deleteLabel,
    whyLabel,
    liked,
    checked,
    likeLabel,
    checkLabel,
    onToggleLike,
    onToggleCheck,
    onDragStart,
    onDragEnd,
}: TipCapsuleCardProps) {
    // The ring fires when the tick goes on, wherever that came from — this card,
    // or the same tip ticked elsewhere — so the confirmation is identical to the
    // Bank of tips deck rather than the canvas being the quiet surface.
    const [prevChecked, setPrevChecked] = React.useState(checked);
    const [glowKey, setGlowKey] = React.useState(0);
    const [showGlow, setShowGlow] = React.useState(false);
    if (prevChecked !== checked) {
        setPrevChecked(checked);
        if (checked) {
            setGlowKey(key => key + 1);
            setShowGlow(true);
        }
    }
    React.useEffect(() => {
        if (!showGlow) return;
        const id = setTimeout(() => setShowGlow(false), 1200);
        return () => clearTimeout(id);
    }, [showGlow, glowKey]);

    return (
        <div
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            /* Even padding all round. Only the title needs to keep clear of the ×,
               so it carries that inset itself (below) — a card-wide pr-12 would
               also push the right-aligned actions 48px short of the edge. */
            className={`relative rounded-[32px] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-stone-200/60 flex flex-col gap-2.5 w-full max-w-[440px] mx-auto select-none my-3 ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <button
                type="button"
                onClick={onDelete}
                aria-label={deleteLabel}
                title={deleteLabel}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
                <X size={16} className="stroke-[2.5]" />
            </button>

            {/* pr-8 clears the × button, which reaches 46px in from the card edge. */}
            <h4 className="font-sans font-semibold text-[15px] text-stone-900 leading-snug pr-8">
                {tip.title}
            </h4>

            <p className="font-sans text-[14px] text-stone-600 leading-relaxed">
                {tip.description}
            </p>

            {tip.whyItHelps && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                    <span className="font-sans text-[12px] font-semibold text-stone-500">
                        {whyLabel}
                    </span>
                    <p className="font-sans text-[13px] text-stone-400 leading-relaxed">
                        {tip.whyItHelps}
                    </p>
                </div>
            )}

            {tip.example && (
                <p className="font-sans text-[13px] text-stone-500 italic border-l-2 border-stone-200 pl-3">
                    {tip.example}
                </p>
            )}

            {/* Favourite and tick, in the same order, states and right-hand
                placement as the Bank of tips deck, so the tip reads identically
                wherever the writer meets it. */}
            <div className="flex items-center justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={onToggleLike}
                    aria-pressed={liked}
                    aria-label={likeLabel}
                    title={likeLabel}
                    /* Matches the deck's heart: outline goes on like, and the icon
                       grows 40%. See BankOfIdeas for why the border is kept but
                       made transparent. */
                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
                        liked
                            ? 'border-transparent bg-red-50 text-red-500'
                            : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300'
                    }`}
                >
                    <Heart
                        size={16}
                        strokeWidth={2}
                        fill={liked ? 'currentColor' : 'none'}
                        className={`tip-heart ${liked ? 'tip-heart--liked' : ''}`}
                    />
                </button>

                <button
                    type="button"
                    onClick={onToggleCheck}
                    aria-pressed={checked}
                    aria-label={checkLabel}
                    title={checkLabel}
                    /* Ring runs to its end, then the green fill — see the deck's tick. */
                    className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
                        checked
                            ? 'bg-[#87b884] border-[#87b884] text-white shadow-sm mind-power-fill-after-ring'
                            : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300'
                    }`}
                >
                    {showGlow && (
                        <span
                            key={glowKey}
                            aria-hidden
                            className="mind-power-glow-ring mind-power-glow-ring--round"
                        />
                    )}
                    <Check size={15} className="stroke-[3.5]" />
                </button>
            </div>
        </div>
    );
}
