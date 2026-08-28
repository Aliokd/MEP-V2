"use client";

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { WAITLIST_COUNTDOWN_ENDS_AT } from '@/lib/uiFlags';

// The campaign clock: how long until early access opens. One deadline for
// everyone once WAITLIST_COUNTDOWN_ENDS_AT names it; until then a 72-hour
// placeholder anchored per visitor, so the flow can be reviewed with a live
// clock before the launch date exists. See the flag for why that fallback
// must not ship.
//
// Anchored in localStorage rather than restarted on every load — a clock that
// resets on reload announces itself as fake in the first minute. Deliberately
// NOT uid-scoped (see bindLocalStateToAccount): everyone in this flow is
// anonymous, that's the point of the waitlist.
// `-72h` suffix: the window widened from 24h to 72h after launch, and a stored
// future deadline always wins over re-anchoring — so without a new key, every
// visitor from the first day would have kept their old shorter clock. Bump the
// suffix again if the placeholder window ever changes while anchors are live.
const STORAGE_KEY = 'veinote-waitlist-countdown-ends-72h';
const PLACEHOLDER_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * The remaining time as "HH:MM:SS", ticking once a second — or null before the
 * first client tick. Null is the SSR answer too: the deadline lives in
 * localStorage, so the server can't know it and shouldn't guess at markup the
 * client would immediately disagree with.
 *
 * `enabled: false` returns null and, more to the point, never anchors the
 * placeholder deadline — for callers rendered in both flows (the email step),
 * where a plain-flow visitor should not have a campaign clock started on them.
 */
export function useWaitlistCountdown(enabled: boolean = true): string | null {
    const [display, setDisplay] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;

        /**
         * The deadline everyone is counting to, recomputed every tick.
         *
         * With the anchor set, the offer is a rolling GLOBAL window: the first
         * close is the anchor itself, and when a close passes the window
         * re-arms exactly one stride later — the same arithmetic on every
         * device, so every visitor worldwide still reads the same clock. This
         * replaced a fixed deadline after that deadline arrived mid-campaign
         * and parked the clock at 00:00:00 under live ad traffic: a dead
         * clock sells nothing, and re-arming needed a deploy.
         *
         * Without an anchor: the per-visitor localStorage window, review mode.
         */
        const currentDeadline = (): number => {
            const anchor = WAITLIST_COUNTDOWN_ENDS_AT
                ? Date.parse(WAITLIST_COUNTDOWN_ENDS_AT)
                : NaN;
            if (!Number.isNaN(anchor)) {
                const behind = Date.now() - anchor;
                if (behind < 0) return anchor;
                const strides = Math.floor(behind / PLACEHOLDER_WINDOW_MS) + 1;
                return anchor + strides * PLACEHOLDER_WINDOW_MS;
            }
            let stored = 0;
            try {
                stored = Number(localStorage.getItem(STORAGE_KEY));
            } catch { /* private mode: the clock just isn't anchored */ }
            if (stored > Date.now()) return stored;
            const fresh = Date.now() + PLACEHOLDER_WINDOW_MS;
            try {
                localStorage.setItem(STORAGE_KEY, String(fresh));
            } catch { /* same: a session-only clock beats no clock */ }
            return fresh;
        };

        const tick = () => {
            const left = Math.max(0, currentDeadline() - Date.now());
            const pad = (v: number) => String(v).padStart(2, '0');
            const h = Math.floor(left / 3_600_000);
            const m = Math.floor((left % 3_600_000) / 60_000);
            const s = Math.floor((left % 60_000) / 1_000);
            setDisplay(`${pad(h)}:${pad(m)}:${pad(s)}`);
        };

        tick();
        const id = setInterval(tick, 1_000);
        return () => clearInterval(id);
    }, [enabled]);

    return display;
}

/**
 * The clock, in two placements.
 *
 * By default it is a full-width bar across the very top of the screen, on every
 * step of the campaign flow. It was a pill in the top-right corner, which read
 * as a widget stuck to the page; spanning the window makes it the frame the
 * flow happens inside. The steps below it reserve BAR_HEIGHT of headroom — see
 * the padding note in app/onboarding/page.tsx — so nothing slides underneath.
 *
 * `banner` is the email dialog's placement, and is NOT fixed: it is a block the
 * caller lays out immediately above the card, so the deadline and the offer it
 * applies to read as one object. Pinning it to the top of the viewport instead
 * left a screen's worth of gap between the two on a tall window.
 *
 * Either way it wears the glass the sticky controls wear, for the same reason:
 * the mood question puts a photograph behind everything.
 */
/** How much headroom the fixed bar needs from the screens under it. */
export const COUNTDOWN_BAR_HEIGHT = 'h-11';
export default function CountdownBanner({ banner = false }: { banner?: boolean }) {
    const { t } = useLanguage();
    const time = useWaitlistCountdown();

    if (!time) return null;

    return (
        <div className={`flex items-center justify-center gap-2.5 backdrop-blur-2xl backdrop-saturate-150 ${
            banner
                // Full width of whatever column it is placed in, and squared to
                // a card's radius rather than a pill — at this width a full
                // pill reads as a stretched lozenge.
                //
                // Glass rather than the greige tint: it sits directly on the
                // lime card and takes the same treatment that card does — a
                // white wash thin enough for the painted page to come through,
                // with a lit top edge.
                ? 'w-full rounded-[20px] border border-white/50 bg-white/25 px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
                // The bar: edge to edge, hard against the top of the window,
                // with a hairline underneath to part it from the page. Tinted
                // with the page's own colour rather than white, because it
                // crosses the mood question's full-bleed photographs.
                : `fixed inset-x-0 top-0 z-40 border-b border-white/30 bg-[#DCDDD4]/45 px-4 ${COUNTDOWN_BAR_HEIGHT}`
        }`}>
            <Clock size={banner ? 17 : 15} className="shrink-0 text-stone-600" />
            <span className={`font-medium text-stone-600 ${banner ? 'hidden text-[15px] sm:inline' : 'text-[13px]'}`}>
                {t('onboarding.waitlist.banner_label')}
            </span>
            <span className={`font-semibold tabular-nums text-stone-900 ${banner ? 'text-[17px]' : 'text-[14px]'}`}>
                {time}
            </span>
        </div>
    );
}
