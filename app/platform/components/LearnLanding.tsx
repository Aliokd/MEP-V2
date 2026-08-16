"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * When Deep dive opens — 40 days from 2026-08-15, when it was set.
 *
 * A fixed date on purpose: the previous countdown was `Date.now() + n days`
 * evaluated at mount, so it restarted on every page load and never actually
 * counted down. Move this date to change the deadline.
 */
const DEEP_DIVE_LAUNCH_MS = Date.parse('2026-09-24T00:00:00Z');

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
}

/**
 * Learn landing — light grainy artwork with dark type, per the Figma frames:
 * Master fundamentals and Deep dive side by side, Bank of tips as a wide
 * banner beneath them.
 */
export default function LearnLanding({ onStart, onOpenIdeas }: LearnLandingProps) {
    const { t } = useLanguage();
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4">
            {/* Top pair */}
            <div className="flex-[3] min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={onStart}
                    data-tour="learn-fundamentals"
                    className="group relative text-left w-full min-h-[200px] rounded-[24px] overflow-hidden border border-stone-300/60 transition-all cursor-pointer active:scale-[0.995] shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
                >
                    <img
                        src="/assets/Learn/fundementals.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="relative h-full flex flex-col justify-between p-7 md:p-8">
                        <h2 className="text-3xl md:text-4xl font-sans font-medium text-stone-900 leading-tight max-w-[85%]">
                            {t('learn.master_fundamentals')}
                        </h2>
                        <ArrowRight
                            size={30}
                            strokeWidth={2}
                            className="self-end text-stone-900 transition-transform duration-300 group-hover:translate-x-1.5"
                        />
                    </div>
                </button>

                {/* Deep dive is not open yet, so this is a plain panel rather than a
                    button: it shows the countdown but does not navigate anywhere. */}
                <div
                    aria-disabled="true"
                    className="relative w-full min-h-[200px] rounded-[24px] overflow-hidden border border-stone-300/60 select-none"
                >
                    <img
                        src="/assets/Learn/Deep%20dive.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                    />
                    <div className="relative h-full flex flex-col justify-between p-7 md:p-8">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl md:text-4xl font-sans font-medium text-stone-900 leading-tight">
                                {t('learn.deep_dive')}
                            </h2>
                            <span className="text-base font-sans text-stone-600">
                                {t('learn.coming_soon')}
                            </span>
                        </div>
                        {/* Light pill so the digits stay readable over the dark forest
                            at the bottom of the artwork. */}
                        <span className="self-end bg-white/80 backdrop-blur-sm text-stone-900 text-sm font-mono font-semibold tracking-wide px-3.5 py-1.5 rounded-full">
                            {formatCountdown(DEEP_DIVE_LAUNCH_MS - now)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Full-width banner */}
            <button
                onClick={onOpenIdeas}
                data-tour="learn-ideas"
                className="group relative text-left w-full flex-1 min-h-[110px] rounded-[24px] overflow-hidden border border-stone-300/60 transition-all cursor-pointer active:scale-[0.995] shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
            >
                <img
                    src="/assets/Learn/bank%20of%20tips.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="relative h-full flex items-center justify-between gap-6 px-7 md:px-10">
                    <h2 className="text-3xl md:text-4xl font-sans font-medium text-stone-900 leading-tight">
                        {t('learn.bank_of_ideas')}
                    </h2>
                    <ArrowRight
                        size={30}
                        strokeWidth={2}
                        className="text-stone-900 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
                    />
                </div>
            </button>
        </div>
    );
}
