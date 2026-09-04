"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Pause, Info } from 'lucide-react';
import { BRAIN_SM_SRC, BRAIN_GOLD_SM_SRC, fillClipTop } from './brainGeometry';
import MindPowerHelp from './MindPowerHelp';
import WeekRecap from './WeekRecap';
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
    streak: Pick<Streak, 'current' | 'best'> & { days: number };
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

export default function StreakGrid({ weeks, streak, thisWeek, language, t }: StreakGridProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: true });
    const [helpOpen, setHelpOpen] = useState(false);
    const [recapWeek, setRecapWeek] = useState<WeekCell | null>(null);

    const readEdges = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const max = track.scrollWidth - track.clientWidth;
        setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft >= max - 1 });
    }, []);

    // Open with the current week in the middle: the past to its left, the
    // weeks ahead to its right. Centred again whenever the track changes
    // size — the first measurement can land before the row has its final
    // width — until the person scrolls it themselves.
    const userScrolled = useRef(false);
    const programmatic = useRef(false);
    const centreOnCurrent = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const current = track.querySelector<HTMLElement>('[data-current]');
        const left = current ? current.offsetLeft - (track.clientWidth - current.offsetWidth) / 2 : track.scrollWidth;
        programmatic.current = true;
        track.scrollTo({ left, behavior: 'auto' });
        readEdges();
    }, [readEdges]);

    const count = weeks.length;
    useEffect(() => {
        if (count === 0) return;
        userScrolled.current = false;
        centreOnCurrent();
    }, [count, centreOnCurrent]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            if (!userScrolled.current) centreOnCurrent();
            readEdges();
        });
        ro.observe(track);
        return () => ro.disconnect();
    }, [centreOnCurrent, readEdges]);

    const handleScroll = () => {
        if (programmatic.current) programmatic.current = false;
        else userScrolled.current = true;
        readEdges();
    };

    const page = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) return;
        userScrolled.current = true;
        track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
    };

    return (
        <section aria-labelledby="mp-streaks-heading" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id="mp-streaks-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                    {t('progress.mp_streaks')}
                </h2>
                <span className="text-[22px] leading-none text-stone-500">{t('progress.mp_weeks')}</span>
                {(streak.current > 0 || streak.days > 0) && (
                    <span className="ml-auto flex flex-wrap items-baseline gap-x-3 text-[14px] tabular-nums" data-streak-count>
                        {/* Showing up, day after day: the streak everyone can keep. */}
                        {streak.days > 0 && (
                            <span className="text-[#A9DE9F]" data-day-streak>
                                {streak.days === 1
                                    ? t('progress.mp_day_streak_one')
                                    : t('progress.mp_day_streak_other').replace('{n}', String(streak.days))}
                            </span>
                        )}
                        {streak.current > 0 && (
                            <span className="text-[#E8CC8C]">
                                {t('progress.mp_streak_count').replace('{n}', String(streak.current))}
                                {streak.best > streak.current && (
                                    <span className="text-stone-500"> · {t('progress.mp_streak_best').replace('{n}', String(streak.best))}</span>
                                )}
                            </span>
                        )}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1 sm:gap-2">
                <PageArrow direction={-1} disabled={edges.start} onClick={() => page(-1)} label={t('progress.mp_earlier_weeks')} />

                <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    data-streak-track
                    className="mind-power-carousel relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                >
                    {weeks.map(week => (
                        <WeekBrain key={week.key} week={week} t={t} onOpen={week.isFuture ? undefined : () => setRecapWeek(week)} />
                    ))}
                </div>

                <PageArrow direction={1} disabled={edges.end} onClick={() => page(1)} label={t('progress.mp_later_weeks')} />
            </div>

            {/* This week's score, in its parts, against the target — and how it all works. */}
            {thisWeek && (
                <div className="flex flex-col gap-2" data-score-breakdown>
                    <div className="flex items-center gap-3">
                        <span className="text-[14px] font-medium text-[#A9DE9F]">{t('progress.mp_this_week')}</span>
                        <span className={`text-[14px] tabular-nums ${thisWeek.golden ? 'text-[#E8CC8C]' : 'text-stone-300'}`}>
                            {t('progress.mp_score_of').replace('{score}', String(thisWeek.score)).replace('{target}', String(WEEKLY_TARGET))}
                        </span>
                        <button
                            type="button"
                            onClick={() => setHelpOpen(true)}
                            aria-label={t('progress.help_open')}
                            title={t('progress.help_open')}
                            data-help-open
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white/[0.08] hover:text-[#F5F4EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                        >
                            <Info size={16} strokeWidth={1.75} aria-hidden />
                        </button>
                    </div>
                    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-stone-500 tabular-nums">
                        {thisWeek.parts.filter(p => p.enabled).map(p => (
                            <li key={p.key} data-part={p.key}>
                                <span className="text-stone-400">{t(PART_LABEL[p.key])}</span>{' '}
                                {p.bonus ? '+' : ''}{Math.round(p.points)}/{Math.round(p.max)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-[12px] text-stone-500">
                {t('progress.mp_week_goal_score').replace('{target}', String(WEEKLY_TARGET))}
            </p>

            <MindPowerHelp open={helpOpen} onClose={() => setHelpOpen(false)} language={language} t={t} />
            <WeekRecap week={recapWeek} onClose={() => setRecapWeek(null)} language={language} t={t} />
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
function WeekBrain({ week, t, onOpen }: { week: WeekCell; t: (key: string) => string; onOpen?: () => void }) {
    const minutes = Math.round(week.seconds / 60);
    const label = t('progress.mp_week_n').replace('{n}', String(week.index));
    const detail =
        week.score !== null
            ? t('progress.mp_score_of').replace('{score}', String(week.score)).replace('{target}', String(WEEKLY_TARGET))
            : `${minutes} ${t('progress.mp_minutes_short')}`;
    // The green rises from the bottom of the brain itself, not of the image frame.
    const litClip = `inset(${fillClipTop(week.ratio).toFixed(1)}% 0 0 0)`;

    // A week that has happened is a way into its recap: a box rises behind it on
    // hover and a click opens what was done in it. The current week keeps its
    // box, so the eye lands on it in the middle of the strip.
    return (
        <div
            data-week={week.index}
            data-current={week.isCurrent || undefined}
            data-golden={week.golden || undefined}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen}
            onKeyDown={onOpen ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
            aria-label={onOpen ? t('progress.recap_open').replace('{n}', String(week.index)) : undefined}
            className={`flex basis-1/3 lg:basis-1/5 shrink-0 snap-center flex-col items-center gap-3 rounded-2xl px-1 py-3 transition-colors duration-200 ${
                week.isFuture ? 'opacity-40' : ''
            } ${week.isCurrent ? 'bg-white/[0.06] ring-1 ring-white/10' : ''} ${
                onOpen ? 'cursor-pointer hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F]' : ''
            }`}
            title={week.isFuture ? undefined : `${detail} · ${minutes} ${t('progress.mp_minutes_short')}`}
        >
            {/* The brain is the point of the cell. With the streaks row now the
                full page width there is room for it to be big — the cap only
                stops it running away on very wide screens. */}
            <div
                className="relative w-full max-w-[220px] aspect-[4/3]"
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
