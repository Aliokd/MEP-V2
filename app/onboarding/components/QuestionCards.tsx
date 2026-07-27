"use client";

import { motion } from 'framer-motion';
import { BookOpen, Check, Compass, Music2, PenLine, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// Per-answer identity. Keyed by the answer value stored in `answers`, so adding
// an option means adding an entry here plus `title`/`desc` in the locale files.
const CARD_STYLES: Record<string, { Icon: LucideIcon; tint: string }> = {
    lyricist: { Icon: PenLine, tint: '#F6C9D8' },
    melodist: { Icon: Music2, tint: '#CFE8B8' },
    producer: { Icon: SlidersHorizontal, tint: '#A8C8E8' },
    storyteller: { Icon: BookOpen, tint: '#F6E9A8' },
    explorer: { Icon: Compass, tint: '#E6D6F2' },
};

const FALLBACK_STYLE = { Icon: Music2, tint: '#E4E4DF' };

interface QuestionCardsProps {
    questionId: string;
    options: { value: string }[];
    selectedOption: string | null;
    disabled: boolean;
    onSelect: (value: string) => void;
}

export default function QuestionCards({ questionId, options, selectedOption, disabled, onSelect }: QuestionCardsProps) {
    const { t } = useLanguage();

    // Cards start stacked and rotated in the middle, then fan outwards into
    // place. `mid` drives how far each one travels and which way it leans.
    const mid = (options.length - 1) / 2;

    return (
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {options.map((option, i) => {
                const { Icon, tint } = CARD_STYLES[option.value] ?? FALLBACK_STYLE;
                const isSelected = selectedOption === option.value;
                const offset = i - mid;

                return (
                    <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        disabled={disabled}
                        initial={{
                            opacity: 0,
                            x: -offset * 55,
                            y: 28,
                            rotate: offset * 7,
                            scale: 0.88,
                        }}
                        animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                        transition={{
                            duration: 0.55,
                            delay: i * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group w-full text-left sm:w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.667rem)] ${
                            disabled ? 'cursor-default' : 'cursor-pointer'
                        }`}
                    >
                        <div
                            className={`flex h-full flex-col gap-4 rounded-[26px] border p-5 transition-colors duration-300 md:p-6 ${
                                isSelected
                                    ? 'border-[#86BE7F] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]'
                                    : 'border-stone-200/70 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] group-hover:border-stone-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <span
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                                    style={{ backgroundColor: tint }}
                                >
                                    <Icon size={20} className="text-stone-800" strokeWidth={1.8} />
                                </span>

                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                                        isSelected ? 'scale-100 bg-[#86BE7F] opacity-100' : 'scale-75 opacity-0'
                                    }`}
                                >
                                    <Check size={14} className="text-white" strokeWidth={3} />
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-[17px] font-sans font-semibold leading-tight text-stone-900">
                                    {t(`onboarding.questions.${questionId}.options.${option.value}.title`)}
                                </h3>
                                <p className="text-[13.5px] font-medium leading-snug text-stone-500">
                                    {t(`onboarding.questions.${questionId}.options.${option.value}.desc`)}
                                </p>
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
