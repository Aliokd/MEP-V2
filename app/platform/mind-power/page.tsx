"use client";

import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Play, Pause, RotateCcw, ChevronLeft } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { useMindPowerProgress } from '@/lib/mindPowerContext';
import {
    useFocusTimer,
    toggleFocusTimer,
    resetFocusTimer,
    setFocusDuration,
    formatFocusTime,
    FOCUS_PRESET_MINUTES,
} from '@/lib/focusTimer';
import {
    streakWeeks,
    computeStreak,
    dayStreak,
    weekScore,
    weekKey,
    recordHealthMark,
    WEEKLY_ACTIVITY_EVENT,
    type WeekCell,
} from '@/lib/weeklyActivity';
import type { WeekScore } from '@/lib/mindPowerScore';
import * as btn from '@/app/platform/components/buttonStyles';
import MindPowerBrain from './components/MindPowerBrain';
import { BRAIN_SRC, BRAIN_GOLD_SRC, BRAIN_SM_SRC, BRAIN_GOLD_SM_SRC } from './components/brainGeometry';
import StreakGrid from './components/StreakGrid';
import StayAhead from './components/StayAhead';
import Activities from './components/Activities';

/**
 * Songwriter's Mind Power, as a page of its own.
 *
 * The header pill opens this; the layout wraps it in the dark shell and the
 * Back button. Everything the pill used to show in a popover is here with the
 * room it was designed for: the brain you can point at, the weekly streaks, the
 * four progress bars and the focus timer at a size you can read across a room.
 */
/** "1st", "2." or "1:a" — the week's ordinal in the language's own convention. */
function ordinal(n: number, language: string): string {
    if (language === 'no') return `${n}.`;
    if (language === 'sv') {
        const last = n % 10;
        const teen = n % 100 === 11 || n % 100 === 12;
        return `${n}:${(last === 1 || last === 2) && !teen ? 'a' : 'e'}`;
    }
    const rule = new Intl.PluralRules('en', { type: 'ordinal' }).select(n);
    const suffix = rule === 'one' ? 'st' : rule === 'two' ? 'nd' : rule === 'few' ? 'rd' : 'th';
    return `${n}${suffix}`;
}

export default function MindPowerPage() {
    const { t, language } = useLanguage();
    const progress = useMindPowerProgress();
    const router = useRouter();

    // The four brain renders are the page's weight. Ask for them in the first
    // render, before the components that draw them have mounted, so the big
    // one is already arriving when the stage appears.
    preload(BRAIN_SRC, { as: 'image', fetchPriority: 'high' });
    preload(BRAIN_GOLD_SRC, { as: 'image' });
    preload(BRAIN_SM_SRC, { as: 'image' });
    preload(BRAIN_GOLD_SM_SRC, { as: 'image' });

    const goBack = () => {
        // A fresh tab landing here directly has no in-app history — falling
        // back to Create beats bouncing the user out of the app.
        if (window.history.length > 1) router.back();
        else router.push('/platform/create');
    };

    // Start empty so the server and the first client paint agree, then fill in
    // from localStorage and keep following the layout's activity ticks.
    const [weeks, setWeeks] = useState<WeekCell[]>([]);
    const [streak, setStreak] = useState({ current: 0, best: 0, days: 0 });
    const [thisWeek, setThisWeek] = useState<WeekScore | null>(null);
    useEffect(() => {
        const refresh = () => {
            setWeeks(streakWeeks());
            const { current, best } = computeStreak();
            setStreak({ current, best, days: dayStreak() });
            setThisWeek(weekScore(weekKey(new Date())));
        };
        refresh();
        window.addEventListener(WEEKLY_ACTIVITY_EVENT, refresh);
        return () => window.removeEventListener(WEEKLY_ACTIVITY_EVENT, refresh);
    }, []);

    return (
        <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8 pt-5 sm:pt-8 pb-20 flex flex-col gap-16 md:gap-20">
            {/* Back, the title beside it, the level at the far end; what this is, beneath. */}
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={goBack}
                        aria-label={t('common.back')}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-[#F5F4EE] transition-colors duration-200 hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                    >
                        <ChevronLeft size={20} strokeWidth={2} />
                    </button>
                    <h1 className="font-lyrics font-normal text-[26px] sm:text-[38px] leading-[1.05] text-[#F5F4EE]">
                        {t('progress.mp_page_title')}
                    </h1>
                    <Tooltip
                        label={t('progress.mp_level_tip').replace('{ordinal}', ordinal(Math.max(1, progress.activeWeeks), language))}
                        side="bottom"
                    >
                        <span
                            tabIndex={0}
                            data-level
                            className="ml-auto shrink-0 rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5 text-[13px] leading-none text-stone-300 whitespace-nowrap cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F]"
                        >
                            {t('progress.level_label')} {progress.progressLevel}
                        </span>
                    </Tooltip>
                </div>
                <p className="text-[13.5px] leading-relaxed text-stone-400 max-w-xl sm:pl-14">
                    {t('progress.mind_power_desc')}
                </p>
            </header>

            {/* The brain and its six regions, filled to this week's progress. */}
            <MindPowerBrain t={t} weeklyRatio={weeks.find(w => w.isCurrent)?.ratio ?? 0} />

            {/* Streaks take the full width; the brains get the room. The focus
                timer that used to sit beside them now lives in Stay ahead, with
                the rest of the body's part. */}
            <StreakGrid weeks={weeks} streak={streak} thisWeek={thisWeek} language={language} t={t} />

            {/* The body's part: the focus timer first, then breathing, hands, rest. */}
            <StayAhead
                t={t}
                leading={
                    <div className="flex flex-col gap-4">
                        <h3 className="font-lyrics font-normal text-[28px] leading-[1.1] text-[#F5F4EE]">
                            {t('progress.focus_timer')}
                        </h3>
                        <FocusTimerBlock t={t} />
                    </div>
                }
            />

            {/* What the four areas add up to. */}
            <Activities progress={progress} language={language} t={t} />
        </main>
    );
}

/**
 * Its own component so the countdown's tick re-renders this card alone, not the
 * brain and the streak grid above it.
 */
function FocusTimerBlock({ t }: { t: (key: string) => string }) {
    const { durationSeconds, remainingSeconds, isRunning, isComplete, isPristine } = useFocusTimer();

    // A session run to zero is a health mark for the day — recorded once per completion.
    const markedRef = useRef(false);
    useEffect(() => {
        if (isComplete && !markedRef.current) {
            markedRef.current = true;
            recordHealthMark('focus');
        }
        if (!isComplete) markedRef.current = false;
    }, [isComplete]);

    return (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-10 flex flex-col items-center gap-7">
            <span
                className={`font-lyrics font-light text-[72px] sm:text-[96px] leading-none tabular-nums tracking-tight ${
                    isComplete ? 'text-[#A9DE9F]' : 'text-[#F5F4EE]'
                }`}
                aria-live="off"
            >
                {formatFocusTime(remainingSeconds)}
            </span>

            {isComplete && (
                <p className="text-[14px] text-[#A9DE9F] -mt-3">{t('progress.focus_done')}</p>
            )}

            <div className="flex items-center gap-3">
                {!isPristine && (
                    <button
                        type="button"
                        onClick={resetFocusTimer}
                        aria-label={t('progress.focus_reset')}
                        title={t('progress.focus_reset')}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-stone-400 hover:bg-white/10 hover:text-[#F5F4EE] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F]"
                    >
                        <RotateCcw size={18} strokeWidth={1.5} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={toggleFocusTimer}
                    className={`${btn.primary('md')} cursor-pointer min-w-[140px]`}
                    aria-label={isRunning ? t('progress.focus_pause') : t('progress.focus_start')}
                >
                    {isRunning ? <Pause size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
                    {isRunning ? t('progress.focus_pause_short') : t('progress.focus_start_short')}
                </button>
            </div>

            {/* Length is only choosable from a clean clock — changing it mid-session
                would silently throw away the time already put in. */}
            {isPristine && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {FOCUS_PRESET_MINUTES.map(minutes => {
                        const selected = durationSeconds === minutes * 60;
                        return (
                            <button
                                key={minutes}
                                type="button"
                                onClick={() => setFocusDuration(minutes)}
                                aria-pressed={selected}
                                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] ${
                                    selected
                                        ? 'bg-[#F5F4EE] text-stone-900'
                                        : 'bg-white/[0.07] text-stone-400 hover:bg-white/[0.14] hover:text-[#F5F4EE]'
                                }`}
                            >
                                {minutes} {t('progress.focus_min')}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
