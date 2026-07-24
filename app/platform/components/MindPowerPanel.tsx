"use client";
import { Brain, Play, Pause } from 'lucide-react';

interface MindPowerPanelProps {
    t: (key: string) => string;
    progressLevel: number;
    levelProgress: number;
    wordsTyped: number;
    recordingMinutes: number;
    wordsGoal: number;
    completedLessonsCount: number;
    lessonsGoal: number;
    practiceMinutes: number;
    practiceGoal: number;
    communityCount: number;
    communityGoal: number;
    activeQuote: string;
    isFocusRunning: boolean;
    focusSeconds: number;
    onToggleFocus: () => void;
}

function formatTimer(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
    recordingMinutes,
    wordsGoal,
    completedLessonsCount,
    lessonsGoal,
    practiceMinutes,
    practiceGoal,
    communityCount,
    communityGoal,
    activeQuote,
    isFocusRunning,
    focusSeconds,
    onToggleFocus,
}: MindPowerPanelProps) {
    return (
        <div className="w-80 bg-[#F5F4EE] rounded-[24px] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.14)] border border-stone-200/70 flex flex-col gap-5 normal-case text-stone-800">
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
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700">{t('progress.focus_timer')}</span>
                <button
                    onClick={onToggleFocus}
                    className="flex items-center gap-2.5 text-stone-800 hover:text-stone-950 transition-colors cursor-pointer"
                >
                    {isFocusRunning ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
                    <span className="text-lg font-semibold tabular-nums">{formatTimer(focusSeconds)}</span>
                </button>
            </div>

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
                    <span className="text-[9px] text-stone-500 leading-tight">{wordsTyped} {t('progress.words')}<br />{recordingMinutes} {t('progress.min_rec')}</span>
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
