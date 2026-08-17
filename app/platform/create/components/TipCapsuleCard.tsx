"use client";

import React from 'react';
import { X } from 'lucide-react';
import type { CanvasTip } from '@/lib/canvasTips';

interface TipCapsuleCardProps {
    tip: CanvasTip;
    onDelete: () => void;
    deleteLabel: string;
    whyLabel: string;
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
    onDragStart,
    onDragEnd,
}: TipCapsuleCardProps) {
    return (
        <div
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`relative rounded-[32px] bg-white p-5 pr-12 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-stone-200/60 flex flex-col gap-2.5 w-full max-w-[440px] mx-auto select-none my-3 ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
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

            <h4 className="font-sans font-semibold text-[15px] text-stone-900 leading-snug">
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
        </div>
    );
}
