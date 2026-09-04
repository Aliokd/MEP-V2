"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Share2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
    GOLDEN_MIND_EVENT,
    WEEKLY_ACTIVITY_EVENT,
    STREAK_INTRO_KEY,
    goldenMindDue,
    markGoldenMindShown,
    activeWeekLevel,
    readActiveWeekCount,
    readWeeklyActivity,
    computeStreak,
    dayStreak,
    streakWeeks,
    weekKey,
} from '@/lib/weeklyActivity';
import { safeLocalStorageSetItem } from '@/lib/storage';
import GoldenMindStage from '@/app/platform/mind-power/components/GoldenMindStage';
import * as btn from './buttonStyles';

/**
 * The golden-mind celebration: the popup for the week the user reaches the
 * weekly goal. Mounted once in the platform layout; opens on GOLDEN_MIND_EVENT,
 * which weeklyActivity fires on every activity tick while the week is over
 * the goal and the popup has not been dismissed — and on mount for the same
 * condition, so a reload mid-celebration brings it back. Dismissing it, by
 * either button, the backdrop or Escape, is what marks the week as shown.
 *
 * The animation itself is GoldenMindStage, shared with the streak card the
 * Share option links to. Everything under it — what this is, the message, the
 * ways out — is there from the first frame; only the brain moves.
 *
 * To preview it in a browser console:
 *   window.dispatchEvent(new CustomEvent('veinote-golden-mind'))
 */

export default function GoldenMindCelebration() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<number | null>(null);
    const [week, setWeek] = useState<{ index: number; minutes: number } | null>(null);
    const [streak, setStreak] = useState(0);
    const [days, setDays] = useState(0);

    const openRef = useRef(false);
    const close = useCallback(() => {
        openRef.current = false;
        markGoldenMindShown();
        setOpen(false);
    }, []);

    useEffect(() => {
        const show = () => {
            if (openRef.current) return;
            openRef.current = true;
            const current = streakWeeks().find(w => w.isCurrent);
            setWeek(current ? { index: current.index, minutes: Math.round(current.seconds / 60) } : null);
            setStreak(computeStreak().current);
            setDays(dayStreak());
            setOpen(true);
        };
        // An account that already holds a streak when streaks arrive sees it
        // once, so it knows where to look — checked now, and again whenever the
        // record changes, since a long-time account's history is rebuilt a
        // moment after the page loads. Dismissing does not mark the current
        // week as celebrated: markGoldenMindShown is a no-op until the week is
        // actually golden, and the flag is what makes this once.
        let introTimer: number | null = null;
        const maybeIntro = () => {
            if (localStorage.getItem(STREAK_INTRO_KEY) || openRef.current) return;
            if (computeStreak().current < 1) return;
            safeLocalStorageSetItem(STREAK_INTRO_KEY, 'true');
            introTimer = window.setTimeout(show, 1200);
        };
        // The preview event (see above) opens it whether or not the week is due.
        window.addEventListener(GOLDEN_MIND_EVENT, show);
        window.addEventListener(WEEKLY_ACTIVITY_EVENT, maybeIntro);
        if (goldenMindDue()) show();
        else maybeIntro();
        return () => {
            if (introTimer !== null) window.clearTimeout(introTimer);
            window.removeEventListener(GOLDEN_MIND_EVENT, show);
            window.removeEventListener(WEEKLY_ACTIVITY_EVENT, maybeIntro);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, close]);

    if (!open || typeof document === 'undefined') return null;

    const firstName = (user?.displayName || '').trim().split(' ')[0];
    const title = firstName
        ? t('progress.golden_title').replace('{name}', firstName)
        : t('progress.golden_title_noname');

    const learnMore = () => {
        close();
        router.push('/platform/mind-power');
    };

    // Share: a public card at /streak carrying the numbers in its query string,
    // through the device's share sheet where there is one, otherwise copied.
    const share = async () => {
        const params = new URLSearchParams();
        if (firstName) params.set('name', firstName);
        params.set('level', String(activeWeekLevel()));
        params.set('weeks', String(readActiveWeekCount()));
        params.set('min', String(Math.round((readWeeklyActivity()[weekKey(new Date())] || 0) / 60)));
        if (streak > 0) params.set('streak', String(streak));
        const url = `${window.location.origin}/streak?${params.toString()}`;
        const text = t('progress.golden_share_text');

        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: text, text, url });
                return;
            } catch (err) {
                // Closing the sheet is not a failure; anything else falls through to the clipboard.
                if ((err as DOMException)?.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
            copiedTimer.current = window.setTimeout(() => setCopied(false), 2200);
        } catch {
            // No clipboard either: nothing sensible left to do silently.
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={close}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('progress.golden_aria')}
                data-golden-mind
                onClick={e => e.stopPropagation()}
                className="golden-pop-in relative w-full max-w-[660px] overflow-hidden rounded-3xl bg-[#2a2a2a] px-8 pb-12 pt-6 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-14"
            >
                {/* The render carries wide transparent margins; the negative margin
                    takes the bottom one back so the words sit close to the brain. */}
                <GoldenMindStage play={open} tone="dark" className="mx-auto -mb-[4%] w-[min(100%,440px)]" />

                {/* Below the brain, there from the first frame so nothing waits on the
                    animation: what this is, the message, and the ways out. */}
                <div className="relative mt-4 flex flex-col items-center gap-7 text-center">
                    <div className="flex flex-col items-center gap-2" data-streak-header>
                        <span className="font-lyrics text-[24px] leading-none text-stone-300">{t('progress.golden_eyebrow')}</span>
                        {week && (
                            <span className="text-[15px] text-stone-500 tabular-nums">
                                {t('progress.mp_week_n').replace('{n}', String(week.index))} · {week.minutes} {t('progress.mp_minutes_short')}
                                {days > 1 && <> · {t('progress.mp_day_streak_other').replace('{n}', String(days))}</>}
                            </span>
                        )}
                        {streak > 0 && (
                            <span className="text-[15px] text-[#E8CC8C] tabular-nums" data-streak-line>
                                {streak === 1
                                    ? t('progress.golden_streak_one')
                                    : t('progress.golden_streak_other').replace('{n}', String(streak))}
                            </span>
                        )}
                    </div>
                    <h2 className="font-lyrics font-normal text-[26px] sm:text-[32px] leading-[1.15] text-[#F5F4EE] max-w-[22ch]">
                        {title}
                    </h2>
                    <div className="flex w-full items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={share}
                                data-share
                                aria-label={copied ? t('progress.golden_link_copied') : t('progress.golden_share')}
                                title={t('progress.golden_share')}
                                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-stone-200 transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                            >
                                {copied ? <Check size={19} strokeWidth={2.2} aria-hidden /> : <Share2 size={19} strokeWidth={1.9} aria-hidden />}
                            </button>
                            <span
                                className={`text-[13px] text-stone-400 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}
                                aria-live="polite"
                            >
                                {copied ? t('progress.golden_link_copied') : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                type="button"
                                onClick={close}
                                className="text-[18px] text-stone-300 underline decoration-stone-500 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] cursor-pointer"
                            >
                                {t('progress.golden_got_it')}
                            </button>
                            <button type="button" onClick={learnMore} className={btn.primary('lg')} data-learn-more>
                                {t('progress.golden_read_more')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
