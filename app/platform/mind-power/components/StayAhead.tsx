"use client";

import { useState } from 'react';
import { Play } from 'lucide-react';
import BreathingExercise from './BreathingExercise';

/**
 * Stay ahead: the body's part in the songwriting. Four cards in a row — the
 * breathing exercise, which runs here, and three more that are named now and
 * filled later. The row scrolls on a phone and sits four across on a desktop.
 */

interface StayAheadProps {
    t: (key: string) => string;
}

const CARDS = [
    { key: 'breathing', title: 'progress.sa_breathing', sub: null, live: true },
    { key: 'finger', title: 'progress.sa_finger_tips', sub: null, live: false },
    { key: 'yoga', title: 'progress.sa_yoga', sub: null, live: false },
    { key: 'holistic', title: 'progress.sa_holistic', sub: 'progress.sa_holistic_sub', live: false },
] as const;

export default function StayAhead({ t }: StayAheadProps) {
    const [breathing, setBreathing] = useState(false);

    return (
        <section aria-labelledby="mp-stay-ahead-heading" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
                <h2 id="mp-stay-ahead-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                    {t('progress.stay_ahead_title')}
                </h2>
                <p className="text-[12.5px] text-stone-500">{t('progress.stay_ahead_sub')}</p>
            </div>

            <div className="mind-power-carousel -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {CARDS.map(card => (
                    <div
                        key={card.key}
                        data-card={card.key}
                        className="relative flex min-h-[250px] basis-[76%] shrink-0 snap-center flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-8 text-center sm:basis-[calc(50%-8px)] lg:basis-auto"
                    >
                        <div className="flex flex-col gap-3">
                            <h3 className="font-lyrics font-normal text-[28px] leading-[1.1] text-[#F5F4EE]">{t(card.title)}</h3>
                            {card.sub && (
                                <p className="font-lyrics text-[24px] leading-[1.1] text-stone-400">{t(card.sub)}</p>
                            )}
                        </div>
                        {card.live ? (
                            <button
                                type="button"
                                onClick={() => setBreathing(true)}
                                data-start-breathing
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[20px] font-medium text-[#F5F4EE] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                            >
                                <Play size={20} strokeWidth={0} fill="currentColor" aria-hidden />
                                {t('progress.sa_start')}
                            </button>
                        ) : (
                            <span className="absolute bottom-4 text-[11px] text-stone-600">{t('progress.sa_soon')}</span>
                        )}
                    </div>
                ))}
            </div>

            <BreathingExercise open={breathing} onClose={() => setBreathing(false)} t={t} />
        </section>
    );
}
