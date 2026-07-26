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
                    className="group relative text-left w-full flex-1 min-h-[160px] rounded-[20px] overflow-hidden border border-stone-300/85 hover:border-stone-400 transition-all cursor-pointer active:scale-[0.995] shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
                >
                    <video
                        src="/assets/Learn/Fundamentals.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/10 to-transparent" />
                    <div className="relative h-full flex flex-col justify-end gap-2 p-8">
                        <h2 className="text-4xl font-sans font-medium text-white leading-tight">
                            {t('learn.master_fundamentals')}
                        </h2>
                        <span className="self-start bg-yellow-400 text-stone-900 text-sm font-mono font-bold tracking-wide px-3 py-1 rounded-full">
                            {formatCountdown(targetTime - now)}
                        </span>
                    </div>
                </button>

                <button
                    onClick={onOpenDeepDive}
                    className="group relative text-left w-full flex-1 min-h-[160px] rounded-[20px] overflow-hidden bg-stone-950 border border-stone-200/80 hover:border-stone-400 transition-all cursor-pointer active:scale-[0.995]"
                >
                    <img
                        src="/assets/Learn/deep-dive-cover.jpg"
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent" />
                    <div className="relative h-full flex flex-col justify-end p-8">
                        <div className="flex items-end justify-between gap-4">
                            <h2 className="text-4xl font-sans font-medium text-white leading-tight">
                                {t('learn.deep_dive')}
                            </h2>
                            <span className="text-sm font-sans font-semibold text-yellow-400 tracking-wide shrink-0">
                                {t('learn.coming_soon')}
                            </span>
                        </div>
                    </div>
                </button>
            </div>

            <button
                onClick={onOpenIdeas}
                data-tour="learn-ideas"
                className="group relative text-left w-full md:w-[38%] flex-1 md:flex-none min-h-[160px] rounded-[20px] overflow-hidden border border-stone-300/85 hover:border-stone-400 transition-all cursor-pointer active:scale-[0.995] shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
            >
                <img
                    src="/assets/Learn/bank-of-ideas-cover.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
                <div className="relative h-full flex flex-col justify-end gap-2 p-8">
                    <h2 className="text-4xl font-sans font-medium text-white leading-tight">
                        {t('learn.bank_of_ideas')}
                    </h2>
                    <p className="text-sm text-stone-200 font-medium">{t('learn.bank_of_ideas_desc')}</p>
                </div>
            </button>
        </div>
    );
}
