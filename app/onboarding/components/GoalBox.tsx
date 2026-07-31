"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * The goals question: a grid of cards and a box to put them in. Tapping a card
 * takes it out of the grid and drops it into the box; tapping the card sitting
 * in the box's opening takes it back out again. A visitor who wants something
 * we didn't think of writes it on a card of their own.
 *
 * Like the struggle deck, this question takes as many answers as it is given —
 * the box is meant to fill up. Only the newest card shows in the opening, so
 * once there is more than one in there the slider across the box front scrubs
 * back through the rest.
 */

// A goal the visitor wrote themselves is stored as its own text behind this
// marker, so it stays distinguishable from the option ids without needing a
// second field on the answer. Everything downstream that resolves a label has
// to know about it — see `isCustom`/`customText`.
export const CUSTOM_PREFIX = 'custom:';

export const isCustom = (value: string) => value.startsWith(CUSTOM_PREFIX);
export const customText = (value: string) => value.slice(CUSTOM_PREFIX.length);

// Written on a card, so it has a card's worth of room and no more. Measured
// against the smallest that card ever gets — the part of it standing clear of
// the box's rim — where this many characters still fit without being cut off.
const CUSTOM_MAX_LENGTH = 38;

interface GoalBoxProps {
    questionId: string;
    options: { value: string }[];
    /** What's in the box, oldest first. */
    picked: string[];
    onChange: (picked: string[]) => void;
}

export default function GoalBox({ questionId, options, picked, onChange }: GoalBoxProps) {
    const { t } = useLanguage();

    const [writing, setWriting] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (writing) inputRef.current?.focus();
    }, [writing]);

    const label = (value: string) =>
        isCustom(value) ? customText(value) : t(`onboarding.questions.${questionId}.options.${value}`);

    const remaining = options.filter((option) => !picked.includes(option.value));

    // The box shows the card most recently put in it, and taking that one back
    // out uncovers the one before. There is no scrubber across the box front any
    // more: a slider is a lot of chrome for a pile of at most six, and popping
    // the top is a thing you can do with the card itself.
    const showing = picked[picked.length - 1];

    const put = (value: string) => {
        onChange([...picked, value]);
    };

    const takeBack = (value: string) => {
        onChange(picked.filter((entry) => entry !== value));
    };

    const commitDraft = () => {
        const text = draft.trim().slice(0, CUSTOM_MAX_LENGTH);
        if (!text) return;

        const value = `${CUSTOM_PREFIX}${text}`;
        // Writing the same goal twice would put two identical cards in the box.
        if (!picked.includes(value)) put(value);

        setDraft('');
        setWriting(false);
    };

    return (
        <div className="space-y-4">
            {/* The cards still on the table, and one more that is blank and
                waiting to be written on. `layoutId` is what carries a card from
                here into the box's opening and back — the same element in two
                places, so the trip is animated rather than a swap.

                Write-your-own used to be a full-width bar above this grid, under
                a heading that named what the grid plainly was. Both are gone:
                it is a card like the others now, dashed instead of filled, and
                it takes the seat left over when a goal goes into the box. */}
            <div className="mx-auto grid w-full max-w-[600px] grid-cols-2 gap-3 sm:grid-cols-3">
                {remaining.map((option) => (
                    <motion.button
                        key={option.value}
                        layoutId={`goal-${option.value}`}
                        type="button"
                        onClick={() => put(option.value)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className="aspect-[4/3] overflow-hidden rounded-[18px] bg-white p-3.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.07)] ring-1 ring-stone-300/40 transition-shadow hover:shadow-[0_14px_32px_rgba(0,0,0,0.10)] sm:aspect-[9/4]"
                    >
                        <span className="flex h-full items-center text-[13px] font-sans font-medium leading-snug text-[#363636] md:text-[14px]">
                            {label(option.value)}
                        </span>
                    </motion.button>
                ))}

                {writing ? (
                    <div className="aspect-[4/3] overflow-hidden rounded-[18px] border-2 border-dashed border-[#363636] p-3.5 sm:aspect-[9/4]">
                        <input
                            ref={inputRef}
                            value={draft}
                            maxLength={CUSTOM_MAX_LENGTH}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitDraft();
                                } else if (e.key === 'Escape') {
                                    setDraft('');
                                    setWriting(false);
                                }
                            }}
                            onBlur={commitDraft}
                            placeholder={t('onboarding.questions.goals.custom_placeholder')}
                            className="h-full w-full bg-transparent text-[13px] font-sans font-medium leading-snug text-[#363636] outline-none placeholder:font-normal placeholder:text-stone-500 md:text-[14px]"
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setWriting(true)}
                        className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-stone-400/70 text-[13px] font-sans font-medium text-stone-600 transition-colors hover:border-[#363636] hover:text-[#363636] sm:aspect-[9/4] md:text-[14px]"
                    >
                        <Plus className="h-5 w-5 stroke-[2.5px]" />
                        {t('onboarding.questions.goals.add_custom')}
                    </button>
                )}
            </div>

            {/* The box. Line art rather than a filled object — it reads as the
                drawing it is, and nothing about it competes with the cards. */}
            <div className="relative mx-auto aspect-[860/460] w-full max-w-[420px]">
                {/* Everything behind the card: the two side flaps folded out,
                    and the inside of the back wall seen over the near rim. No
                    outlines anywhere — the box is built out of five flat tones,
                    which is all a white carton in even light actually is. */}
                <svg viewBox="0 0 860 460" aria-hidden="true" className="absolute inset-0 h-full w-full">
                    <defs>
                        {/* The near rim catches the most light along its fold and
                            falls away toward the viewer. */}
                        <linearGradient id="goalbox-rim" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FDFDFC" />
                            <stop offset="100%" stopColor="#EFEFEA" />
                        </linearGradient>
                        <linearGradient id="goalbox-front" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EDEDE8" />
                            <stop offset="72%" stopColor="#F4F4F0" />
                            <stop offset="100%" stopColor="#F4F4F0" stopOpacity="0" />
                        </linearGradient>
                        {/* Sits under the rim's fold, on the front face. */}
                        <linearGradient id="goalbox-shade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C9C9C2" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#C9C9C2" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Inside the box: the back wall, in its own shadow. */}
                    <polygon points="222,104 638,104 700,152 160,152" fill="#DEDED8" />

                    {/* The two flaps, folded out and up. The underside edge of
                        each is a shade darker than its face. */}
                    <polygon points="26,30 222,104 222,132 26,58" fill="#FAFAF8" />
                    <polygon points="26,58 222,132 222,142 26,68" fill="#E6E6E0" />
                    <polygon points="834,30 638,104 638,132 834,58" fill="#FAFAF8" />
                    <polygon points="834,58 638,132 638,142 834,68" fill="#E6E6E0" />
                </svg>

                {/* Whatever is showing, standing in the box. Its lower half is
                    covered by the near rim painted over it below. */}
                {showing && (
                    <motion.button
                        key={showing}
                        layoutId={`goal-${showing}`}
                        type="button"
                        onClick={() => takeBack(showing)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={t('onboarding.questions.goals.take_back')}
                        // Wider and shorter than it used to be, and standing
                        // higher: 70% of this card clears the rim instead of
                        // half of a square one, and the extra width costs the
                        // longest goal a line of wrapping. The old shape cut
                        // sentences off mid-word against the rim.
                        className="absolute bottom-[54%] left-1/2 z-10 aspect-[5/3] w-[40%] -translate-x-1/2 overflow-hidden rounded-[16px] bg-white p-3 text-left shadow-[0_10px_26px_rgba(0,0,0,0.10)] ring-1 ring-stone-300/40"
                    >
                        {/* Top-aligned, not centred: only the upper part of this
                            card clears the rim, so centred text would read as
                            half a sentence disappearing into the box. */}
                        <span className="block text-[11px] font-sans font-medium leading-snug text-[#363636] md:text-[12px]">
                            {label(showing)}
                        </span>
                    </motion.button>
                )}

                {/* The near rim and the front face, over the card. */}
                <svg viewBox="0 0 860 460" aria-hidden="true" className="absolute inset-0 z-20 h-full w-full">
                    <polygon points="152,296 708,296 708,452 152,452" fill="url(#goalbox-front)" />
                    <rect x="152" y="296" width="556" height="60" fill="url(#goalbox-shade)" />
                    <polygon points="160,150 700,150 782,298 78,298" fill="url(#goalbox-rim)" />
                </svg>

            </div>

        </div>
    );
}
