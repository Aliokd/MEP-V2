"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

// Placeholder duration only — not tied to a real deadline yet.
const COUNTDOWN_DURATION_MS = 37 * 24 * 60 * 60 * 1000;

function formatCountdown(remainingMs: number) {
    const clamped = Math.max(0, remainingMs);
    const totalSeconds = Math.floor(clamped / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface LearnLandingProps {
    onStart: () => void;
    onOpenIdeas: () => void;
    onOpenDeepDive: () => void;
}

export default function LearnLanding({ onStart, onOpenIdeas, onOpenDeepDive }: LearnLandingProps) {
    const { t } = useLanguage();
    const [targetTime] = React.useState(() => Date.now() + COUNTDOWN_DURATION_MS);
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col md:flex-row gap-4 items-stretch">
            <div className="w-full md:w-[62%] flex-1 md:flex-none flex flex-col gap-4">
                <button
                    onClick={onStart}
                    data-tour="learn-fundamentals"
                    className="text-left w-full flex-1 min-h-[160px] bg-white border border-stone-300/85 rounded-[20px] p-8 flex flex-col justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:border-stone-400 transition-all cursor-pointer active:scale-[0.995]"
                >
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-mono font-semibold text-red-500 tracking-wide">
                            {formatCountdown(targetTime - now)}
                        </span>
                        <h2 className="text-3xl font-sans font-light text-stone-500 leading-tight">
                            {t('learn.master_fundamentals')}
                        </h2>
                    </div>
                </button>

                <button
                    onClick={onOpenDeepDive}
                    className="text-left w-full flex-1 min-h-[160px] bg-white/50 border border-stone-200/80 rounded-[20px] p-8 flex flex-col justify-between gap-6 hover:border-stone-400 hover:bg-white transition-all cursor-pointer active:scale-[0.995]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-3xl font-sans font-light text-stone-400 leading-tight">
                            {t('learn.deep_dive')}
                        </h2>
                        <span className="text-sm font-sans font-semibold text-red-500 tracking-wide shrink-0">
                            {t('learn.coming_next_year')}
                        </span>
                    </div>
                </button>
            </div>

            <button
                onClick={onOpenIdeas}
                data-tour="learn-ideas"
                className="text-left w-full md:w-[38%] flex-1 md:flex-none min-h-[160px] bg-white border border-stone-300/85 rounded-[20px] p-8 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:border-stone-400 transition-all cursor-pointer active:scale-[0.995]"
            >
                <h2 className="text-3xl font-sans font-light text-stone-500">
                    {t('learn.bank_of_ideas')}
                </h2>
                <p className="text-sm text-stone-500 font-medium">{t('learn.bank_of_ideas_desc')}</p>
            </button>
        </div>
    );
}
