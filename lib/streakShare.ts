"use client";

import { activeWeekLevel, readActiveWeekCount, readWeeklyActivity, computeStreak, weekKey } from './weeklyActivity';

/**
 * Sharing a streak: the public card at /streak, with the numbers in its query
 * string, handed to the device's share sheet where there is one and copied to
 * the clipboard otherwise. Used by the weekly celebration and by the streaks
 * strip, so both share the same link.
 */

export function buildStreakShareUrl(firstName: string): string {
    const params = new URLSearchParams();
    if (firstName) params.set('name', firstName);
    params.set('level', String(activeWeekLevel()));
    params.set('weeks', String(readActiveWeekCount()));
    params.set('min', String(Math.round((readWeeklyActivity()[weekKey(new Date())] || 0) / 60)));
    const streak = computeStreak().current;
    if (streak > 0) params.set('streak', String(streak));
    return `${window.location.origin}/streak?${params.toString()}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export async function shareStreak(text: string, firstName: string): Promise<ShareOutcome> {
    const url = buildStreakShareUrl(firstName);
    if (typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: text, text, url });
            return 'shared';
        } catch (err) {
            // Closing the sheet is not a failure; anything else falls through to the clipboard.
            if ((err as DOMException)?.name === 'AbortError') return 'dismissed';
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch {
        return 'failed';
    }
}
