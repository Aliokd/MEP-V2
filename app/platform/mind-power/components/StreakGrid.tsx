"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Pause, Info } from 'lucide-react';
import { BRAIN_SM_SRC, BRAIN_GOLD_SM_SRC, fillClipTop } from './brainGeometry';
import MindPowerHelp from './MindPowerHelp';
import WeekRecap from './WeekRecap';
import { weekScore, type WeekCell, type Streak } from '@/lib/weeklyActivity';
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
    const [helpOpen, setHelpOpen] = useState(false);
    const [recapWeek, setRecapWeek] = useState<WeekCell | null>(null);

    // The middle of the strip is the focus: whichever week sits there is the
    // selected one, and the panel below describes it. Scrolling, swiping or
    // the arrows move a different week into the middle; clicking a week off
    // to the side brings it there; clicking the week already in the middle
    // opens its recap. The weeks ahead can be seen but never take the middle.
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const selected = weeks.find(w => w.key === selectedKey && !w.isFuture) ?? weeks.find(w => w.isCurrent) ?? null;
    const selectedScore = selected ? (selected.isCurrent ? thisWeek : weekScore(selected.key)) : null;
    const selectableCount = weeks.filter(w => !w.isFuture).length;
    const edges = {
        start: !selected || selected.index <= 1,
        end: !selected || selected.index >= selectableCount,
    };

    const cellFor = (key: string) => trackRef.current?.querySelector<HTMLElement>(`[data-week-key="${key}"]`) ?? null;

    // Scrolls a week into the middle. A scroll the strip starts itself ends on
    // the week it was aimed at, so when it settles the handler below reads
    // that same week back and nothing changes — no flag needed.
    const centreOn = useCallback((key: string, smooth: boolean) => {
        const track = trackRef.current;
        const cell = cellFor(key);
        if (!track || !cell) return;
        const left = cell.offsetLeft - (track.clientWidth - cell.offsetWidth) / 2;
        if (Math.abs(track.scrollLeft - left) < 1) return;
        track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // The latest selection, for handlers that may fire twice before a render.
    const selectedRef = useRef(selected);
    selectedRef.current = selected;

    const select = useCallback((key: string, smooth = true) => {
        setSelectedKey(key);
        centreOn(key, smooth);
    }, [centreOn]);

    // Open on the current week, in the middle; keep the selected week in the
    // middle when the strip changes size, since the first measurement can land
    // before the row has its final width.
    const count = weeks.length;
    useEffect(() => {
        if (count === 0 || !selected) return;
        centreOn(selected.key, false);
        // Only on the strip filling in — later selections centre themselves.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count]);

    // Only a real change of width re-centres — not the observer's first call,
    // and not the week list being rebuilt on a tick, which must never pull a
    // scroll in progress back to where it was.
    const selectedKeyRef = useRef<string | null>(null);
    selectedKeyRef.current = selected?.key ?? null;
    useEffect(() => {
        const track = trackRef.current;
        if (!track || typeof ResizeObserver === 'undefined') return;
        let lastWidth = track.clientWidth;
        const ro = new ResizeObserver(() => {
            if (track.clientWidth === lastWidth) return;
            lastWidth = track.clientWidth;
            if (selectedKeyRef.current) centreOn(selectedKeyRef.current, false);
        });
        ro.observe(track);
        return () => ro.disconnect();
    }, [centreOn]);

    // When a scroll settles, the week nearest the middle is the choice — unless
    // it is a week ahead, in which case the strip comes back to the current one.
    const settleTimer = useRef<number | null>(null);
    const handleScroll = () => {
        if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            settleTimer.current = null;
            const track = trackRef.current;
            if (!track) return;
            const middle = track.scrollLeft + track.clientWidth / 2;
            let nearest: WeekCell | null = null;
            let best = Infinity;
            for (const week of weeks) {
                const cell = cellFor(week.key);
                if (!cell) continue;
                const gap = Math.abs(cell.offsetLeft + cell.offsetWidth / 2 - middle);
                if (gap < best) {
                    best = gap;
                    nearest = week;
                }
            }
            if (!nearest) return;
            if (nearest.isFuture) {
                const current = weeks.find(w => w.isCurrent);
                if (current) select(current.key);
            } else {
                setSelectedKey(nearest.key);
            }
        }, 120);
    };
    useEffect(
        () => () => {
            if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
        },
        [],
    );

    // The arrows move the focus one week at a time.
    const page = (direction: -1 | 1) => {
        const from = selectedRef.current;
        if (!from) return;
        const next = weeks.find(w => w.index === from.index + direction);
        if (next && !next.isFuture) {
            selectedRef.current = next;
            select(next.key);
        }
    };

    const onWeekClick = (week: WeekCell) => {
        if (week.key === selected?.key) setRecapWeek(week);
        else select(week.key);
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
                    {/* Room at both ends, so the first and last weeks can reach the middle too. */}
                    <div className="shrink-0 basis-1/3 lg:basis-[40%]" aria-hidden />
                    {weeks.map(week => (
                        <WeekBrain
                            key={week.key}
                            week={week}
                            t={t}
                            selected={selected?.key === week.key}
                            onSelect={week.isFuture ? undefined : () => onWeekClick(week)}
                        />
                    ))}
                    <div className="shrink-0 basis-1/3 lg:basis-[40%]" aria-hidden />
                </div>

                <PageArrow direction={1} disabled={edges.end} onClick={() => page(1)} label={t('progress.mp_later_weeks')} />
            </div>

            {/* The selected week's score in its parts, centred under the strip; this
                week by default, any past week on a click. From here, the recap. */}
            {selected && (
                <div className="flex flex-col items-center gap-3 text-center" data-score-breakdown data-selected-week={selected.index}>
                    <div className="flex items-center gap-3">
                        <span className="text-[14px] font-medium text-[#A9DE9F]">
                            {selected.isCurrent ? t('progress.mp_this_week') : t('progress.mp_week_n').replace('{n}', String(selected.index))}
                        </span>
                        <span className={`text-[14px] tabular-nums ${selected.golden ? 'text-[#E8CC8C]' : 'text-stone-300'}`}>
                            {selectedScore
                                ? t('progress.mp_score_of').replace('{score}', String(selectedScore.score)).replace('{target}', String(WEEKLY_TARGET))
                                : t('progress.mp_before_scoring').replace('{min}', String(Math.round(selected.seconds / 60)))}
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
                    {selectedScore && (
                        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px] text-stone-500 tabular-nums">
                            {selectedScore.parts.filter(p => p.enabled).map(p => (
                                <li key={p.key} data-part={p.key}>
                                    <span className="text-stone-400">{t(PART_LABEL[p.key])}</span>{' '}
                                    {p.bonus ? '+' : ''}{Math.round(p.points)}/{Math.round(p.max)}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={() => setRecapWeek(selected)}
                        data-recap-open
                        className="text-[13px] text-stone-400 underline decoration-stone-600 underline-offset-4 transition-colors hover:text-[#F5F4EE] hover:decoration-stone-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] cursor-pointer"
                    >
                        {t('progress.recap_open').replace('{n}', String(selected.index))}
                    </button>
                </div>
            )}

            <p className="text-center text-[12px] text-stone-500">
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
function WeekBrain({
    week,
    t,
    selected,
    onSelect: onOpen,
}: {
    week: WeekCell;
    t: (key: string) => string;
    selected: boolean;
    onSelect?: () => void;
}) {
    const minutes = Math.round(week.seconds / 60);
    const label = t('progress.mp_week_n').replace('{n}', String(week.index));
    const detail =
        week.score !== null
            ? t('progress.mp_score_of').replace('{score}', String(week.score)).replace('{target}', String(WEEKLY_TARGET))
            : `${minutes} ${t('progress.mp_minutes_short')}`;
    // The green rises from the bottom of the brain itself, not of the image frame.
    const litClip = `inset(${fillClipTop(week.ratio).toFixed(1)}% 0 0 0)`;

    // A week that has happened can be selected: a box rises behind it on hover,
    // and a click moves the box there and turns the panel below to that week.
    return (
        <div
            data-week={week.index}
            data-week-key={week.key}
            data-current={week.isCurrent || undefined}
            data-selected={selected || undefined}
            data-golden={week.golden || undefined}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            aria-pressed={onOpen ? selected : undefined}
            onClick={onOpen}
            onKeyDown={onOpen ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
            aria-label={onOpen ? (selected ? t('progress.recap_open') : t('progress.mp_week_n')).replace('{n}', String(week.index)) : undefined}
            className={`flex basis-1/3 lg:basis-1/5 shrink-0 snap-center flex-col items-center gap-3 rounded-2xl px-1 py-3 transition-colors duration-200 ${
                week.isFuture ? 'opacity-40' : ''
            } ${selected ? 'bg-white/[0.06] ring-1 ring-white/10' : ''} ${
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
                    selected ? 'text-[#F5F4EE]' : 'text-stone-400'
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
            {/* The week in the middle shows where it stands. */}
            {selected && (
                <span className="-mt-1.5 text-[12px] text-stone-500 tabular-nums">{detail}</span>
            )}
        </div>
    );
}
