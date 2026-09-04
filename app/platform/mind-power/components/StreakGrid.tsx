"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Pause } from 'lucide-react';
import { BRAIN_SM_SRC, BRAIN_GOLD_SM_SRC, fillClipTop } from './brainGeometry';
import type { WeekCell, Streak } from '@/lib/weeklyActivity';
import { WEEKLY_TARGET, type WeekScore, type PartKey } from '@/lib/mindPowerScore';

/**
 * Streaks: one brain per week, filling green from the bottom with that week's
 * share of golden — its score against the target — and gold once it is there.
 * Each cell is the real paper brain twice over — a greyed copy underneath,
 * and the lit copy on top clipped to the share — so a half-full brain is
 * unmistakably the same object, half lit.
 *
 * The weeks ride in a horizontal strip, four in view (three on a phone), that
 * opens on the current week and scrolls back to the account's first. The
 * arrows page it a screen at a time; a swipe does the same. Under the strip,
 * this week's score broken into its parts, so the target is something to aim
 * at rather than a number to guess.
 */

interface StreakGridProps {
    weeks: WeekCell[];
    streak: Pick<Streak, 'current' | 'best'>;
    thisWeek: WeekScore | null;
    language: string;
    t: (key: string) => string;
}

const PART_LABEL: Record<PartKey, string> = {
    consistency: 'progress.score_consistency',
    craft: 'progress.score_craft',
    health: 'progress.score_health',
    community: 'progress.score_community',
};

export default function StreakGrid({ weeks, streak, thisWeek, t }: StreakGridProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: true });

    const readEdges = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const max = track.scrollWidth - track.clientWidth;
        setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft >= max - 1 });
    }, []);

    // Open on the current week: the newest cells are at the end.
    const count = weeks.length;
    useEffect(() => {
        const track = trackRef.current;
        if (!track || count === 0) return;
        track.scrollTo({ left: track.scrollWidth, behavior: 'auto' });
        readEdges();
    }, [count, readEdges]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(readEdges);
        ro.observe(track);
        return () => ro.disconnect();
    }, [readEdges]);

    const page = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
    };

    return (
        <section aria-labelledby="mp-streaks-heading" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id="mp-streaks-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                    {t('progress.mp_streaks')}
                </h2>
                <span className="text-[22px] leading-none text-stone-500">{t('progress.mp_weeks')}</span>
                {streak.current > 0 && (
                    <span className="ml-auto text-[14px] text-[#E8CC8C] tabular-nums" data-streak-count>
                        {t('progress.mp_streak_count').replace('{n}', String(streak.current))}
                        {streak.best > streak.current && (
                            <span className="text-stone-500"> · {t('progress.mp_streak_best').replace('{n}', String(streak.best))}</span>
                        )}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1 sm:gap-2">
                <PageArrow direction={-1} disabled={edges.start} onClick={() => page(-1)} label={t('progress.mp_earlier_weeks')} />

                <div
                    ref={trackRef}
                    onScroll={readEdges}
                    data-streak-track
                    className="mind-power-carousel flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                >
                    {weeks.map(week => (
                        <WeekBrain key={week.key} week={week} t={t} />
                    ))}
                </div>

                <PageArrow direction={1} disabled={edges.end} onClick={() => page(1)} label={t('progress.mp_later_weeks')} />
            </div>

            {/* This week's score, in its parts, against the target. */}
            {thisWeek && (
                <div className="flex flex-col gap-2" data-score-breakdown>
                    <div className="flex items-baseline gap-3">
                        <span className="text-[14px] font-medium text-[#A9DE9F]">{t('progress.mp_this_week')}</span>
                        <span className={`text-[14px] tabular-nums ${thisWeek.golden ? 'text-[#E8CC8C]' : 'text-stone-300'}`}>
                            {t('progress.mp_score_of').replace('{score}', String(thisWeek.score)).replace('{target}', String(WEEKLY_TARGET))}
                        </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-stone-500 tabular-nums">
                        {thisWeek.parts.filter(p => p.enabled).map(p => (
                            <li key={p.key}>
                                <span className="text-stone-400">{t(PART_LABEL[p.key])}</span> {Math.round(p.points)}/{Math.round(p.max)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-[12px] text-stone-500">
                {t('progress.mp_week_goal_score').replace('{target}', String(WEEKLY_TARGET))}
            </p>
        </section>
    );
}

function PageArrow({
    direction,
    disabled,
    onClick,
    label,
}: {
    direction: -1 | 1;
    disabled: boolean;
    onClick: () => void;
    label: string;
}) {
    const Icon = direction < 0 ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="flex h-10 w-8 items-center justify-center rounded-full text-[#F5F4EE] transition-opacity duration-300 hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F]"
        >
            <Icon size={26} strokeWidth={1.75} aria-hidden />
        </button>
    );
}

/**
 * The render is shown whole, transparent margins and all — an earlier version
 * scaled it up inside a clipped box to fill the cell, and cut the crown off
 * every brain. The cell is a little wider instead, so the model keeps its size.
 */
function WeekBrain({ week, t }: { week: WeekCell; t: (key: string) => string }) {
    const minutes = Math.round(week.seconds / 60);
    const label = t('progress.mp_week_n').replace('{n}', String(week.index));
    const detail =
        week.score !== null
            ? t('progress.mp_score_of').replace('{score}', String(week.score)).replace('{target}', String(WEEKLY_TARGET))
            : `${minutes} ${t('progress.mp_minutes_short')}`;
    // The green rises from the bottom of the brain itself, not of the image frame.
    const litClip = `inset(${fillClipTop(week.ratio).toFixed(1)}% 0 0 0)`;

    return (
        <div
            data-week={week.index}
            data-current={week.isCurrent || undefined}
            data-golden={week.golden || undefined}
            className={`flex basis-1/3 sm:basis-1/4 shrink-0 snap-start flex-col items-center gap-2.5 px-1 py-2 ${
                week.isFuture ? 'opacity-40' : ''
            }`}
            title={week.isFuture ? undefined : `${detail} · ${minutes} ${t('progress.mp_minutes_short')}`}
        >
            <div
                className="relative w-full max-w-[136px] aspect-[4/3]"
                role="img"
                aria-label={week.isFuture ? label : `${label}: ${detail}`}
            >
                {/* Unlit paper. */}
                <img
                    src={BRAIN_SM_SRC}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain select-none"
                    style={{ filter: 'grayscale(1) brightness(0.58) contrast(0.95)' }}
                />
                {/* The lit share, rising from the bottom — gold for a week that made the target. */}
                {week.ratio > 0 && (
                    <img
                        src={week.golden ? BRAIN_GOLD_SM_SRC : BRAIN_SM_SRC}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain select-none transition-[clip-path] duration-700 ease-out"
                        style={{ clipPath: litClip }}
                    />
                )}
            </div>

            <span
                className={`inline-flex items-center gap-1.5 text-[15px] leading-tight tabular-nums ${
                    week.isCurrent ? 'text-[#F5F4EE]' : 'text-stone-400'
                }`}
            >
                {label}
                {/* The week made its target: a check in the brain's gold. A forgiven week: a pause. */}
                {week.golden && (
                    <Check size={15} strokeWidth={2.5} className="text-[#E8CC8C]" aria-label={t('progress.mp_week_done')} data-week-done />
                )}
                {week.isRest && (
                    <Pause size={13} strokeWidth={2.5} className="text-stone-500" aria-label={t('progress.mp_rest_week')} data-week-rest />
                )}
            </span>
            {/* The week being written shows where it stands. */}
            {week.isCurrent && (
                <span className="-mt-1.5 text-[12px] text-stone-500 tabular-nums">{detail}</span>
            )}
        </div>
    );
}
