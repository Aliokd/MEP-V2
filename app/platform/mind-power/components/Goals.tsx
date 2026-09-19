"use client";

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConnectionState } from '@/lib/connections';
import { useOnboardingAnswers } from '@/lib/getToKnowYou';
import { answerList, customText, isCustom } from '@/lib/onboardingQuestions';
import type { MindPowerProgress } from '@/lib/mindPowerContext';
import type { PartKey, WeekScore } from '@/lib/mindPowerScore';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * Your goals: what the person said they want from songwriting, each shown with
 * the part of the weekly score that moves it and a number of theirs that says
 * how far along it is.
 *
 * The goals come from onboarding (and the profile's "Get to know you", which
 * keeps them open to change). The score already measures the week in five
 * parts; this is the same measure read from the goal's side: "finish songs" is
 * carried by Craft, "feel better" by Health, "connect with other songwriters"
 * by Community. A goal written in the person's own words has no part of its
 * own, so it rides on the whole score.
 */

const PART_LABEL: Record<PartKey, string> = {
    consistency: 'progress.score_consistency',
    craft: 'progress.score_craft',
    time: 'progress.score_time',
    health: 'progress.score_health',
    community: 'progress.score_community',
};

interface StatContext {
    progress: MindPowerProgress;
    streakDays: number;
    healthyDays: number;
    connections: number;
    /** "3 songs" / "1 song": a count with its own word. */
    count: (n: number, one: string, other: string) => string;
    /** "412 lyrics": a count with a unit that does not change. */
    unit: (n: number, unitKey: string) => string;
}

/** Which part of the week carries each goal, and the number of theirs to show beside it. */
const GOAL_TRACKING: Record<string, { part: PartKey; stat: (c: StatContext) => string }> = {
    finish_songs: { part: 'craft', stat: c => c.count(c.progress.songsCompleted, 'progress.act_song', 'progress.act_songs') },
    unique_sound: { part: 'craft', stat: c => c.unit(c.progress.practiceMinutes, 'progress.min_practiced') },
    move_people: { part: 'craft', stat: c => c.unit(c.progress.wordsTyped, 'progress.act_lyrics') },
    release_music: { part: 'time', stat: c => c.unit(c.progress.recordingMinutes, 'progress.act_min_recordings') },
    creative_fearless: { part: 'consistency', stat: c => c.count(c.streakDays, 'progress.goal_days_one', 'progress.goal_days_other') },
    write_for_loved_ones: { part: 'craft', stat: c => c.count(c.progress.songsCompleted, 'progress.act_song', 'progress.act_songs') },
    feel_better: { part: 'health', stat: c => c.count(c.healthyDays, 'progress.goal_healthy_days_one', 'progress.goal_healthy_days_other') },
    meet_songwriters: { part: 'community', stat: c => c.count(c.connections, 'progress.act_connection', 'progress.act_connections') },
    earn_money: { part: 'craft', stat: c => c.count(c.progress.songsCompleted, 'progress.act_song', 'progress.act_songs') },
};

const LOCALE: Record<string, string> = { en: 'en-GB', no: 'nb-NO', sv: 'sv-SE' };

interface GoalsProps {
    progress: MindPowerProgress;
    thisWeek: WeekScore | null;
    streakDays: number;
    language: string;
    t: (key: string) => string;
}

export default function Goals({ progress, thisWeek, streakDays, language, t }: GoalsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { answers, loaded } = useOnboardingAnswers(user?.uid ?? null);
    const { connections } = useConnectionState();
    const nf = new Intl.NumberFormat(LOCALE[language] || 'en-GB');

    const goals = answerList(answers, 'dream_outcome');

    // Nothing to show until the answers have arrived: an empty pitch that
    // flashes before the goals land would say the wrong thing for a second.
    if (!loaded) return null;

    const ctx: StatContext = {
        progress,
        streakDays,
        healthyDays: thisWeek?.detail.healthyDays ?? 0,
        connections: connections.length,
        // The Activities unit words ("song", "songs") carry no placeholder and
        // take the number in front; this section's own phrases carry one.
        count: (n, one, other) => {
            const word = n === 1 ? t(one) : t(other);
            return word.includes('{n}') ? word.replace('{n}', nf.format(n)) : `${nf.format(n)} ${word}`;
        },
        unit: (n, unitKey) => `${nf.format(n)} ${t(unitKey)}`,
    };

    const openProfile = () => router.push('/platform/profile/get-to-know-you');

    return (
        <section aria-labelledby="mp-goals-heading" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div className="flex flex-col gap-2">
                    <h2 id="mp-goals-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                        {t('progress.goals_title')}
                    </h2>
                    <p className="text-[13.5px] leading-relaxed text-stone-400 max-w-xl">{t('progress.goals_desc')}</p>
                </div>
                {goals.length > 0 && (
                    <button
                        type="button"
                        onClick={openProfile}
                        className="group flex items-center gap-1 text-[13px] font-medium text-stone-400 hover:text-[#F5F4EE] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F]"
                    >
                        {t('progress.goals_edit')}
                        <ArrowRight size={13} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}
            </div>

            {goals.length === 0 ? (
                // No goals yet: the way to give some. The profile's questions
                // are where they are set, so that is where this leads.
                <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-7 md:px-8 flex flex-col items-start gap-4">
                    <div className="flex flex-col gap-1.5">
                        <h3 className="font-lyrics font-normal text-[24px] leading-tight text-[#F5F4EE]">{t('progress.goals_empty_title')}</h3>
                        <p className="text-[13.5px] leading-relaxed text-stone-400 max-w-lg">{t('progress.goals_empty_desc')}</p>
                    </div>
                    <button type="button" onClick={openProfile} className={`${btn.primary('md')} cursor-pointer`}>
                        {t('profile.gtky_title')}
                        <ArrowRight size={16} strokeWidth={2} />
                    </button>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {goals.map(goal => {
                        const tracking = isCustom(goal) ? null : GOAL_TRACKING[goal];
                        const part = tracking && thisWeek ? thisWeek.parts.find(p => p.key === tracking.part) : null;
                        // A part's share of its own maximum; a written goal, the
                        // whole score against 100.
                        const points = part ? part.points : thisWeek?.score ?? 0;
                        const max = part ? part.max : 100;
                        const ratio = max > 0 ? Math.min(1, points / max) : 0;
                        const percent = Math.round(ratio * 100);
                        const label = isCustom(goal) ? customText(goal) : t(`onboarding.questions.dream_outcome.options.${goal}`);
                        const trackedBy = tracking
                            ? t('progress.goals_tracked_by').replace('{part}', t(PART_LABEL[tracking.part]))
                            : t('progress.goals_tracked_score');
                        return (
                            <li
                                key={goal}
                                data-goal={goal}
                                className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] p-5 md:p-6"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <span className="text-[16px] leading-snug text-[#F5F4EE]">{label}</span>
                                    {tracking && (
                                        <span className="font-lyrics font-normal text-[24px] leading-none text-stone-200 tabular-nums whitespace-nowrap">
                                            {tracking.stat(ctx)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[13px] text-stone-400">
                                    {trackedBy}
                                    <span className="mx-1.5 text-stone-600">·</span>
                                    <span className="tabular-nums">
                                        {t('progress.goals_this_week').replace('{points}', String(points)).replace('{max}', String(max))}
                                    </span>
                                </p>
                                <div
                                    className="h-2 w-full overflow-hidden rounded-full bg-black/40"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent}
                                    aria-label={label}
                                >
                                    <div
                                        className="h-full rounded-full bg-[#86BE7F] transition-[width] duration-700 ease-out"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
