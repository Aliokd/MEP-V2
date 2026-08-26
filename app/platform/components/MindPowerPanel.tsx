"use client";
import { Brain, Play, Pause, RotateCcw } from 'lucide-react';
import {
    useFocusTimer,
    toggleFocusTimer,
    resetFocusTimer,
    setFocusDuration,
    formatFocusTime,
    FOCUS_PRESET_MINUTES,
} from '@/lib/focusTimer';
import * as btn from './buttonStyles';

interface MindPowerPanelProps {
    t: (key: string) => string;
    progressLevel: number;
    levelProgress: number;
    wordsTyped: number;
    songsCompleted: number;
    recordingMinutes: number;
    wordsGoal: number;
    completedLessonsCount: number;
    lessonsGoal: number;
    practiceMinutes: number;
    practiceGoal: number;
    communityCount: number;
    communityGoal: number;
    activeQuote: string;
    /**
     * Fill the parent instead of the fixed 320px. Set when the panel renders in
     * flow inside the mobile sidebar drawer, whose 260px rail leaves ~212px of
     * content — a w-80 panel there overflows and gets clipped by the drawer's
     * own overflow-y-auto.
     */
    fullWidth?: boolean;
}

/**
 * Kept as its own component so the countdown's per-second tick re-renders this row
 * alone, leaving the rest of the panel (rings, brain, quote) untouched.
 */
function FocusTimerRow({ t }: { t: (key: string) => string }) {
    const { durationSeconds, remainingSeconds, isRunning, isComplete, isPristine } = useFocusTimer();

    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700">{t('progress.focus_timer')}</span>

                <div className="flex items-center gap-2">
                    {/* Reset is only meaningful once some of the clock has been used. */}
                    {!isPristine && (
                        <button
                            onClick={resetFocusTimer}
                            className={`${btn.iconGhost('xs')} cursor-pointer`}
                            aria-label={t('progress.focus_reset')}
                            title={t('progress.focus_reset')}
                        >
                            <RotateCcw size={14} strokeWidth={1.5} />
                        </button>
                    )}
                    <button
                        onClick={toggleFocusTimer}
                        className={`${btn.ghost('xs')} gap-2.5 text-stone-800 cursor-pointer`}
                        aria-label={isRunning ? t('progress.focus_pause') : t('progress.focus_start')}
                    >
                        {isRunning ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
                        <span
                            className={`text-lg font-semibold tabular-nums ${
                                isComplete ? 'text-[#3f6a3a]' : 'text-stone-800'
                            }`}
                        >
                            {formatFocusTime(remainingSeconds)}
                        </span>
                    </button>
                </div>
            </div>

            {isComplete && (
                <p className="text-[11px] text-[#3f6a3a] font-medium">{t('progress.focus_done')}</p>
            )}

            {/* Length is only choosable from a clean clock — changing it mid-session
                would silently throw away the time already put in. */}
            {isPristine && (
                <div className="flex items-center gap-1.5">
                    {FOCUS_PRESET_MINUTES.map(minutes => {
                        const selected = durationSeconds === minutes * 60;
                        return (
                            <button
                                key={minutes}
                                onClick={() => setFocusDuration(minutes)}
                                className={`${btn.chip(selected, 'bare')} px-2.5 py-1 text-[11px] font-medium cursor-pointer`}
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

function ProgressRing({ percent, size = 44, strokeWidth = 4 }: { percent: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E7E5E1" strokeWidth={strokeWidth} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#86BE7F"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
        </svg>
    );
}

export default function MindPowerPanel({
    t,
    progressLevel,
    levelProgress,
    wordsTyped,
    songsCompleted,
    recordingMinutes,
    wordsGoal,
    completedLessonsCount,
    lessonsGoal,
    practiceMinutes,
    practiceGoal,
    communityCount,
    communityGoal,
    activeQuote,
    fullWidth = false,
}: MindPowerPanelProps) {
    return (
        <div className={`${fullWidth ? 'w-full p-5' : 'w-80 p-6'} bg-[#F5F4EE] rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.14)] border border-stone-200/70 flex flex-col gap-5 normal-case text-stone-800`}>
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-1.5">
                <span className="text-2xl font-serif text-stone-900 font-normal leading-tight">
                    {t('progress.mind_power_title_line1')}<br />{t('progress.mind_power_title_line2')}
                </span>
                <span className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">{t('progress.level_label')} {progressLevel}</span>
                <p className="text-xs text-stone-500 leading-relaxed max-w-[240px]">{t('progress.mind_power_desc')}</p>
            </div>

            {/* Interactive brain progress icon — fills from the bottom up as overall progress increases */}
            <div className="relative w-28 h-28 mx-auto">
                <Brain size={112} strokeWidth={1.1} className="text-stone-300 absolute inset-0" />
                <div
                    className="absolute inset-0 overflow-hidden transition-[clip-path] duration-700 ease-out"
                    style={{ clipPath: `inset(${100 - levelProgress}% 0 0 0)` }}
                >
                    <Brain size={112} strokeWidth={1.1} className="text-[#86BE7F] absolute inset-0" />
                </div>
            </div>

            <div className="h-px bg-stone-200/70 w-full" />

            {/* Focus timer */}
            <FocusTimerRow t={t} />

            <div className="h-px bg-stone-200/70 w-full" />

            {/* Progress section label */}
            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold text-center">{t('progress.section_progress')}</p>

            {/* Quote */}
            <p className="text-xs text-stone-400 italic text-center leading-relaxed -mt-2">
                &ldquo;{activeQuote.startsWith('progress.') ? t(activeQuote) : activeQuote}&rdquo;
            </p>

            {/* Category rings */}
            <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[9px] font-semibold text-stone-600 uppercase tracking-wide">{t('progress.create')}</span>
                    <ProgressRing percent={Math.round((wordsTyped / wordsGoal) * 100)} />
                    <span className="text-[9px] text-stone-500 leading-tight">{wordsTyped} {t('progress.words')}<br />{recordingMinutes} {t('progress.min_rec')}<br />{songsCompleted} {t('progress.songs_completed')}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[9px] font-semibold text-stone-600 uppercase tracking-wide">{t('progress.learn')}</span>
                    <ProgressRing percent={Math.round((completedLessonsCount / lessonsGoal) * 100)} />
                    <span className="text-[9px] text-stone-500 leading-tight">{completedLessonsCount} {t('progress.chapters_checked')}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[9px] font-semibold text-stone-600 uppercase tracking-wide">{t('progress.practice')}</span>
                    <ProgressRing percent={Math.round((practiceMinutes / practiceGoal) * 100)} />
                    <span className="text-[9px] text-stone-500 leading-tight">{practiceMinutes} {t('progress.min_practiced')}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[9px] font-semibold text-stone-600 uppercase tracking-wide">{t('progress.community')}</span>
                    <ProgressRing percent={Math.round((communityCount / communityGoal) * 100)} />
                    <span className="text-[9px] text-stone-500 leading-tight">{communityCount} {t('progress.projects_unit')}</span>
                </div>
            </div>
        </div>
    );
}
