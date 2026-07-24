"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface DeepDiveProps {
    onBackToLanding: () => void;
}

export default function DeepDive({ onBackToLanding }: DeepDiveProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBackToLanding}
                    className="text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    aria-label={t('learn.back_to_overview')}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-3xl font-sans font-light text-stone-500">{t('learn.deep_dive')}</h1>
            </div>

            <div className="w-full flex-1 min-h-[300px] bg-white border border-stone-300/85 rounded-[20px] p-8 flex flex-col items-center justify-center gap-3 text-center shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
                <span className="text-sm font-sans font-semibold text-red-500 tracking-wide">
                    {t('learn.coming_next_year')}
                </span>
                <p className="text-stone-500 text-sm font-medium max-w-md">
                    {t('learn.deep_dive_desc')}
                </p>
            </div>
        </div>
    );
}
