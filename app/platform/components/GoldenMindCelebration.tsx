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
    computeStreak,
    dayStreak,
    streakWeeks,
} from '@/lib/weeklyActivity';
import { shareStreak } from '@/lib/streakShare';
import { pullMindPowerMarks, pushMindPowerMarks } from '@/lib/mindPowerSync';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';
import { useBackDismiss } from '@/hooks/useBackDismiss';
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
    const uid = user?.uid ?? null;
    const close = useCallback(() => {
        openRef.current = false;
        markGoldenMindShown();
        // Onto the account, so no other device shows this week again.
        if (uid) pushMindPowerMarks(uid);
        setOpen(false);
    }, [uid]);

    // On a phone this is a bottom sheet: swiped down to close, and the system
    // Back button closes it rather than leaving the platform.
    useBackDismiss(open, close);
    const { swipeHandlers, swipeStyle } = useSheetSwipe(close, open);

    // Nothing opens until the account's marks have been pulled: a week
    // dismissed on the phone must not replay on the laptop. Until then the
    // ticks that report a due week are ignored — the week stays due, so the
    // next tick after the pull will still catch it.
    const syncedRef = useRef(false);
    useEffect(() => {
        let cancelled = false;
        syncedRef.current = false;

        const show = () => {
            if (openRef.current) return;
            openRef.current = true;
            // Any celebration is the introduction: a golden week now must not
            // be followed by the "you have a streak" popup on the next load.
            safeLocalStorageSetItem(STREAK_INTRO_KEY, 'true');
            const current = streakWeeks().find(w => w.isCurrent);
            setWeek(current ? { index: current.index, minutes: Math.round(current.seconds / 60) } : null);
            setStreak(computeStreak().current);
            setDays(dayStreak());
            setOpen(true);
        };
        const showIfSynced = () => {
            if (syncedRef.current) show();
        };
        // An account that already holds a streak when streaks arrive sees it
        // once, so it knows where to look — checked after the pull, and again
        // whenever the record changes, since a long-time account's history is
        // rebuilt a moment after the page loads. Dismissing does not mark the
        // current week as celebrated: markGoldenMindShown is a no-op until the
        // week is actually golden, and the flag is what makes this once.
        let introTimer: number | null = null;
        const maybeIntro = () => {
            if (!syncedRef.current || openRef.current) return;
            if (localStorage.getItem(STREAK_INTRO_KEY)) return;
            if (computeStreak().current < 1) return;
            safeLocalStorageSetItem(STREAK_INTRO_KEY, 'true');
            if (uid) pushMindPowerMarks(uid);
            introTimer = window.setTimeout(show, 1200);
        };

        // The preview event (see above) opens it whether or not the week is due.
        window.addEventListener(GOLDEN_MIND_EVENT, showIfSynced);
        window.addEventListener(WEEKLY_ACTIVITY_EVENT, maybeIntro);

        (async () => {
            if (uid) await pullMindPowerMarks(uid);
            if (cancelled) return;
            syncedRef.current = true;
            if (goldenMindDue()) show();
            else maybeIntro();
        })();

        return () => {
            cancelled = true;
            if (introTimer !== null) window.clearTimeout(introTimer);
            window.removeEventListener(GOLDEN_MIND_EVENT, showIfSynced);
            window.removeEventListener(WEEKLY_ACTIVITY_EVENT, maybeIntro);
        };
    }, [uid]);

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

    // Share: the public card at /streak, through the device's share sheet where
    // there is one, otherwise copied — the same link the streaks strip shares.
    const share = async () => {
        const outcome = await shareStreak(t('progress.golden_share_text'), firstName);
        if (outcome !== 'copied') return;
        setCopied(true);
        if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(false), 2200);
    };

    return createPortal(
        <div
            className="sheet-shell fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={close}
            role="presentation"
        >
            {/* Centred card from md up; below that `sheet-shell`/`sheet-panel` turn
                it into a bottom sheet (see globals.css), the body scrolls if the
                phone is short, and the footer with the actions stays pinned. */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('progress.golden_aria')}
                data-golden-mind
                onClick={e => e.stopPropagation()}
                className="golden-pop-in sheet-panel relative w-full max-w-[660px] overflow-hidden rounded-3xl bg-[#2a2a2a] px-8 pb-12 pt-6 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-14 max-md:px-6 max-md:pb-3"
                {...swipeHandlers}
                style={swipeStyle}
            >
                <div className="sheet-panel-body no-scrollbar">
                {/* The render carries wide transparent margins; the negative margin
                    takes the bottom one back so the words sit close to the brain.
                    Smaller on a phone so the words and both actions fit without
                    scrolling. */}
                <GoldenMindStage play={open} tone="dark" className="mx-auto -mb-[4%] w-[min(100%,440px)] max-md:w-[min(74%,320px)]" />

                {/* Below the brain, there from the first frame so nothing waits on the
                    animation: what this is, the message, and the ways out. */}
                <div className="relative mt-4 flex flex-col items-center gap-5 md:gap-7 text-center">
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
                </div>
                </div>

                {/* The ways out. Three actions do not fit one phone-width row
                    without the labels breaking, so below md they take two rows:
                    share and "I got it" first, the primary full width underneath.
                    From md the first row dissolves (`md:contents`) and the three sit
                    on one line, primary at the right. */}
                <div className="sheet-panel-footer relative mt-7 flex w-full flex-col gap-4 md:mt-8 md:flex-row md:items-center">
                    <div className="flex items-center justify-between gap-4 md:contents">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={share}
                                data-share
                                aria-label={copied ? t('progress.golden_link_copied') : t('progress.golden_share')}
                                title={t('progress.golden_share')}
                                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-stone-200 transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
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
                        <button
                            type="button"
                            onClick={close}
                            className="shrink-0 whitespace-nowrap px-2 py-2 text-[18px] text-stone-300 underline decoration-stone-500 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86BE7F] cursor-pointer md:ml-auto"
                        >
                            {t('progress.golden_got_it')}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={learnMore}
                        className={`${btn.primary('lg')} whitespace-nowrap max-md:w-full md:ml-6`}
                        data-learn-more
                    >
                        {t('progress.golden_read_more')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
