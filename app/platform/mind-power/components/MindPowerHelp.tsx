"use client";

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wind, Check } from 'lucide-react';
import * as btn from '@/app/platform/components/buttonStyles';
import {
    scoreWeek,
    WEEKLY_TARGET,
    DAY_ACTIVE_SECONDS,
    CRAFT_THRESHOLDS,
    PART_ORDER,
    type PartKey,
} from '@/lib/mindPowerScore';

/**
 * How Mind Power and the streak work, in plain words, with a week worked
 * through. The example is scored by the real scoring function against the
 * real configuration, so what it shows is always what the app would do —
 * change a weight or a threshold and the example follows.
 */

const LOCALE: Record<string, string> = { en: 'en-GB', no: 'nb-NO', sv: 'sv-SE' };

const PART_LABEL: Record<PartKey, string> = {
    consistency: 'progress.score_consistency',
    craft: 'progress.score_craft',
    health: 'progress.score_health',
    community: 'progress.score_community',
};

/** A week most people could have: four proper days, one drop-in, two areas, two breaths, one share. */
const EXAMPLE_DAYS = [
    { minutes: 34, breathing: false },
    { minutes: 22, breathing: true },
    { minutes: 0, visit: true, breathing: false },
    { minutes: 41, breathing: false },
    { minutes: 58, breathing: true },
    { minutes: 0, breathing: false },
    { minutes: 25, breathing: false },
];
const EXAMPLE_WORDS = 320;

interface MindPowerHelpProps {
    open: boolean;
    onClose: () => void;
    language: string;
    t: (key: string) => string;
}

export default function MindPowerHelp({ open, onClose, language, t }: MindPowerHelpProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    const example = scoreWeek({
        daySeconds: EXAMPLE_DAYS.map(d => d.minutes * 60),
        visitOnlyDays: EXAMPLE_DAYS.filter(d => d.visit).length,
        craft: { words: EXAMPLE_WORDS, recordingSeconds: 0, sections: 0, chapters: 1, practiceSeconds: 0 },
        healthyDays: EXAMPLE_DAYS.filter(d => d.breathing).length,
        communityActions: 1,
    });

    // Weekday names in the reader's language, Monday first.
    const weekday = new Intl.DateTimeFormat(LOCALE[language] || 'en-GB', { weekday: 'short' });
    const monday = new Date(2026, 8, 7); // any Monday
    const dayNames = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return weekday.format(d);
    });

    const fill = (key: string, values: Record<string, string | number>) =>
        Object.entries(values).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), t(key));

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mp-help-title"
                data-mind-power-help
                onClick={e => e.stopPropagation()}
                className="golden-pop-in mind-power-scrollbar relative flex max-h-[90vh] w-full max-w-[560px] flex-col gap-7 overflow-y-auto rounded-3xl bg-[#2a2a2a] px-7 py-8 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-10"
            >
                <div className="flex flex-col gap-3">
                    <h2 id="mp-help-title" className="font-lyrics font-normal text-[30px] leading-none">
                        {t('progress.help_title')}
                    </h2>
                    <p className="text-[14.5px] leading-relaxed text-stone-300">{fill('progress.help_intro', { target: WEEKLY_TARGET })}</p>
                </div>

                <section className="flex flex-col gap-3">
                    <h3 className="font-lyrics text-[21px] leading-none text-stone-200">{t('progress.help_parts_title')}</h3>
                    <ul className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-stone-400">
                        <li>
                            <span className="text-[#A9DE9F]">{t('progress.score_consistency')}.</span>{' '}
                            {fill('progress.help_part_consistency', { min: DAY_ACTIVE_SECONDS / 60 })}
                        </li>
                        <li>
                            <span className="text-[#A9DE9F]">{t('progress.score_craft')}.</span>{' '}
                            {fill('progress.help_part_craft', {
                                words: CRAFT_THRESHOLDS.words,
                                practice: CRAFT_THRESHOLDS.practiceSeconds / 60,
                            })}
                        </li>
                        <li>
                            <span className="text-[#A9DE9F]">{t('progress.score_health')}.</span> {t('progress.help_part_health')}
                        </li>
                        <li>
                            <span className="text-[#A9DE9F]">{t('progress.score_community')}.</span> {t('progress.help_part_community')}
                        </li>
                    </ul>
                </section>

                <section className="flex flex-col gap-3">
                    <h3 className="font-lyrics text-[21px] leading-none text-stone-200">{t('progress.help_streak_title')}</h3>
                    <p className="text-[13.5px] leading-relaxed text-stone-400">{fill('progress.help_streak_text', { target: WEEKLY_TARGET })}</p>
                </section>

                <section className="flex flex-col gap-4" data-help-example>
                    <div className="flex flex-col gap-1.5">
                        <h3 className="font-lyrics text-[21px] leading-none text-stone-200">{t('progress.help_example_title')}</h3>
                        <p className="text-[13.5px] leading-relaxed text-stone-400">{fill('progress.help_example_days', { words: EXAMPLE_WORDS })}</p>
                    </div>

                    {/* The week, day by day. */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {EXAMPLE_DAYS.map((d, i) => {
                            const full = d.minutes * 60 >= DAY_ACTIVE_SECONDS;
                            return (
                                <div key={i} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.05] px-1 py-2.5">
                                    <span className="text-[11px] text-stone-500">{dayNames[i]}</span>
                                    <span className={`font-lyrics text-[20px] leading-none tabular-nums ${full ? 'text-[#A9DE9F]' : d.visit ? 'text-stone-300' : 'text-stone-600'}`}>
                                        {d.minutes > 0 ? d.minutes : d.visit ? '·' : '–'}
                                    </span>
                                    <span className="flex h-3 items-center text-[#E8CC8C]" aria-hidden>
                                        {d.breathing && <Wind size={11} strokeWidth={2.2} />}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="-mt-2 text-[11.5px] text-stone-500">{t('progress.help_example_legend')}</p>

                    {/* What it adds up to. */}
                    <ul className="flex flex-col gap-1.5 text-[13.5px] tabular-nums">
                        {example.parts.filter(p => p.enabled).map(p => (
                            <li key={p.key} className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-1.5">
                                <span className="text-stone-400">{t(PART_LABEL[p.key])}</span>
                                <span className="text-stone-200">
                                    {p.bonus ? '+' : ''}{Math.round(p.points)} / {Math.round(p.max)}
                                </span>
                            </li>
                        ))}
                        <li className="flex items-baseline justify-between gap-4 pt-1">
                            <span className="font-medium text-[#F5F4EE]">{t('progress.help_example_total')}</span>
                            <span className="inline-flex items-center gap-2 font-lyrics text-[22px] leading-none text-[#E8CC8C]" data-example-score>
                                {example.score}
                                {example.golden && <Check size={18} strokeWidth={2.5} aria-label={t('progress.mp_week_done')} />}
                            </span>
                        </li>
                    </ul>
                    <p className="text-[13px] leading-relaxed text-stone-400">
                        {fill(example.golden ? 'progress.help_example_golden' : 'progress.help_example_short', { score: example.score, target: WEEKLY_TARGET })}
                    </p>
                </section>

                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={btn.primary('md')}>
                        {t('progress.help_close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
