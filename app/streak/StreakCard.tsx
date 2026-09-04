"use client";

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import GoldenMindStage from '@/app/platform/mind-power/components/GoldenMindStage';
import type { StreakParams } from './params';

/**
 * The card itself: the brain filling and turning gold, whose it is, the
 * numbers, and a way in. On the brand's paper rather than Mind Power's dark
 * stage — this is a public page under the site header, which is drawn in ink
 * for paper — so the stage runs in its light tone.
 */
export default function StreakCard({ name, level, weeks, minutes, streak }: StreakParams) {
    const { t } = useLanguage();
    const title = name ? t('streak_share.title').replace('{name}', name) : t('streak_share.title_noname');
    const line = [
        `${t('progress.level_label')} ${level}`,
        `${weeks} ${t(weeks === 1 ? 'progress.mp_week_one' : 'progress.mp_week_other')}`,
        `${minutes} ${t('progress.mp_minutes_short')} ${t('streak_share.this_week')}`,
        ...(streak > 0
            ? [streak === 1 ? t('streak_share.streak_one') : t('streak_share.streak_other').replace('{n}', String(streak))]
            : []),
    ].join(' · ');

    return (
        <main className="min-h-screen bg-[#E6E3DB] text-[#363636] font-sans flex flex-col selection:bg-[#86BE7F]/30">
            <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-24 sm:pt-28 text-center">
                {/* The render carries wide transparent margins; the negative margins
                    take them back so the brain sits close to the words. */}
                <GoldenMindStage play tone="light" className="w-[min(94vw,600px)] -my-[5%]" />

                <h1 className="font-lyrics font-normal text-[32px] sm:text-[44px] leading-[1.08] max-w-2xl">
                    {title}
                </h1>
                <p className="mt-4 text-[15px] text-stone-600 tabular-nums" data-streak-line>
                    {line}
                </p>
                <p className="mt-6 max-w-md text-[13.5px] leading-relaxed text-stone-500">
                    {t('streak_share.tagline')}
                </p>
                <Link href="/" className={`${btn.primary('md')} mt-8`}>
                    {t('streak_share.cta')}
                </Link>
            </section>
        </main>
    );
}
