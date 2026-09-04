"use client";
import { useSheetSwipe } from '@/hooks/useSheetSwipe';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
    FALLBACK_PRICING,
    getPriceId,
    isPlanPurchasable,
    type BillingPeriod,
    type PlanId,
} from '@/lib/paddle/config';
import { openCheckout } from '@/lib/paddle/checkout';
import * as btn from './buttonStyles';

// The modal is still server-rendered as part of the client bundle, and
// useLayoutEffect warns there. Same measurement, no console noise.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const BILLING_PERIODS: BillingPeriod[] = ['yearly', 'monthly'];

/**
 * Counts the displayed figure from wherever it currently sits to `target`.
 *
 * Eases from the last *painted* value rather than the previous target, so
 * flipping the toggle mid-count continues from what's on screen instead of
 * snapping back to the old price and starting over.
 */
function useAnimatedPrice(target: number, duration = 450): number {
    const [display, setDisplay] = useState(target);
    const displayRef = useRef(target);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const from = displayRef.current;
        if (from === target) return;

        // A number sprinting between two values is exactly what reduced-motion
        // asks us to drop — show the new price outright.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            displayRef.current = target;
            setDisplay(target);
            return;
        }

        const started = performance.now();
        const step = (now: number) => {
            const progress = Math.min(1, (now - started) / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const next = Math.round(from + (target - from) * eased);
            displayRef.current = next;
            setDisplay(next);
            if (progress < 1) frameRef.current = requestAnimationFrame(step);
        };
        frameRef.current = requestAnimationFrame(step);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [target, duration]);

    return display;
}

interface MaxUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Which tier is being sold. Rooms sell Pro; Business sells Max. Defaults to Max. */
    plan?: PlanId;
    /** Optional line explaining which locked feature sent the user here. */
    reason?: string;
}

/**
 * In-platform Max upsell. The onboarding paywall sells both tiers to a brand new
 * user; this one has a narrower job — a Pro user hit a Max-only surface and needs
 * to upgrade without losing their place.
 */
export default function MaxUpgradeModal({ isOpen, onClose, plan = 'max', reason }: MaxUpgradeModalProps) {
    const { t, tList, language } = useLanguage();
    const { user } = useAuth();
    const [billing, setBilling] = useState<BillingPeriod>('yearly');
    const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    // Above the early return — hooks can't sit behind a conditional bail-out.
    const price = FALLBACK_PRICING[plan][billing];
    const animatedPrice = useAnimatedPrice(price);

    // Sliding indicator behind the billing tabs. Measured rather than assumed:
    // the two labels are different widths, and more so in Norwegian and Swedish,
    // so a fixed 50% translate would sit wrong in every language but English.
    const tabsRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Partial<Record<BillingPeriod, HTMLButtonElement | null>>>({});
    const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
    // Suppresses the transition on the first measurement, so the pill appears
    // under the active tab instead of sliding in from the left on open.
    const [indicatorReady, setIndicatorReady] = useState(false);

    useIsomorphicLayoutEffect(() => {
        if (!isOpen) {
            setIndicatorReady(false);
            return;
        }

        const measure = () => {
            const el = tabRefs.current[billing];
            if (!el) return;
            setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
        };

        measure();

        // Label widths can change after mount — a late webfont swap, or the user
        // switching language with the modal open.
        const track = tabsRef.current;
        if (!track || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        return () => observer.disconnect();
    }, [billing, isOpen, language]);

    // Runs after the position above is committed, so the first paint is static.
    useEffect(() => {
        if (indicator && isOpen) setIndicatorReady(true);
    }, [indicator, isOpen]);

    // Swipe the sheet down to dismiss it (phones only — see the hook).
    const { swipeHandlers, swipeStyle } = useSheetSwipe(onClose);

    if (!isOpen || typeof document === 'undefined') return null;

    // What the tier is worth is already written for the onboarding paywall,
    // so this reads the same list rather than forking a second copy.
    const maxOutcome = tList<string>(`onboarding.paywall.plans.${plan}.outcome`);
    const priceId = getPriceId(plan, billing);
    const canCheckout = isPlanPurchasable(plan, billing) && Boolean(user);

    const handleUpgrade = async () => {
        if (!user || !priceId) return;

        setCheckoutError('');
        setIsOpeningCheckout(true);
        try {
            await openCheckout({
                priceId,
                uid: user.uid,
                email: user.email,
                locale: language,
                successUrl: `${window.location.origin}/platform/connect`,
            });
        } catch (err) {
            console.error('Paddle checkout failed to open:', err);
            setCheckoutError(t('onboarding.paywall.checkout_error'));
        } finally {
            setIsOpeningCheckout(false);
        }
    };

    return createPortal(
        <div
            className="sheet-shell fixed inset-0 bg-stone-900/30 backdrop-blur-lg z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Beige gradient across the platform's own surface tones — cream at the
                top falling to the deeper beige the containers use — so the dialog
                is made of the same material as the page behind it. */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t(`connect.upgrade.${plan}.title`)}
                // Scrolls when the content is taller than the viewport, but without
                // painting a scrollbar — the native one on Windows is a chunky
                // stepper track that cuts across the rounded corner.
                className="sheet-panel bg-gradient-to-b from-[#FAF9F5] via-[#F6F6F0] to-[#EBEBE3] rounded-[24px] border border-stone-200/70 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full max-h-[90dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-6 md:p-8 flex flex-col gap-6 relative" {...swipeHandlers} style={swipeStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className={`${btn.icon('sm')} absolute top-5 right-5`}
                >
                    <X className="w-4 h-4" />
                </button>

                {/* md:contents dissolves these wrappers on desktop, so the dialog keeps
                    the single flex column it has always been; below md they become the
                    scrolling body and the pinned footer. */}
                <div className="sheet-panel-body md:contents flex flex-col gap-6">
                <div className="space-y-2 pr-10">
                    <span className="inline-block rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#3f6b3a]">
                        {t(`onboarding.paywall.plans.${plan}.name`)}
                    </span>
                    <h3 className="text-2xl font-sans font-light text-stone-800 tracking-[-0.025em] leading-[1.3]">
                        {t(`connect.upgrade.${plan}.title`)}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed font-sans font-medium">
                        {reason || t(`connect.upgrade.${plan}.subtitle`)}
                    </p>
                </div>

                {/* Billing period — yearly first, same default as the onboarding paywall */}
                <div
                    ref={tabsRef}
                    className="relative inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-white/50 p-1.5 self-start"
                >
                    {/* One pill that travels between the tabs, rather than a
                        background that blinks off one button and onto the other. */}
                    {indicator && (
                        <span
                            aria-hidden="true"
                            className={`absolute top-1.5 bottom-1.5 rounded-full bg-white shadow-sm ${
                                indicatorReady
                                    ? 'transition-[left,width] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none'
                                    : ''
                            }`}
                            style={{ left: indicator.left, width: indicator.width }}
                        />
                    )}
                    {BILLING_PERIODS.map((period) => (
                        <button
                            key={period}
                            ref={(el) => { tabRefs.current[period] = el; }}
                            type="button"
                            onClick={() => setBilling(period)}
                            aria-pressed={billing === period}
                            className={`${btn.segment(billing === period, 'sm')} cursor-pointer`}
                        >
                            {t(`onboarding.paywall.billing.${period}`)}
                        </button>
                    ))}
                </div>

                <div className="flex items-baseline gap-1.5">
                    {/* tabular-nums so the digits don't jitter the layout as the
                        figure counts through intermediate values. */}
                    <span className="text-4xl font-sans font-bold text-stone-900 tabular-nums">
                        ${animatedPrice}
                    </span>
                    <span className="text-xs font-medium text-stone-500">
                        {t(`onboarding.paywall.billing.billed_${billing}`)}
                    </span>
                </div>

                {/* Same lead-in the paywall gives this list, so the points read
                    as additions on top of Pro here too. */}
                <div className="space-y-3">
                    <p className="text-[13px] font-semibold text-stone-500">
                        {t('onboarding.paywall.max_intro')}
                    </p>
                    <ul className="space-y-3">
                        {maxOutcome.map((item, i) => (
                            <li key={i} className="flex gap-3 text-[14px] font-medium leading-snug text-[#363636]/85">
                                <Check size={16} className="mt-0.5 shrink-0 text-[#86BE7F]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {checkoutError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-700">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{checkoutError}</span>
                    </div>
                )}

                </div>

                <div className="sheet-panel-footer md:contents">
                {canCheckout ? (
                    <button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={isOpeningCheckout}
                        className={`${btn.primaryBlock('lg')} cursor-pointer disabled:cursor-not-allowed`}
                    >
                        {isOpeningCheckout
                            ? t('onboarding.paywall.opening_checkout')
                            : t(`connect.upgrade.${plan}.cta`)}
                    </button>
                ) : (
                    // Paddle price ids aren't configured yet, so there is nothing to
                    // open. Send them to the full paywall instead of a dead button.
                    <a
                        href="/onboarding?step=paywall"
                        className={`${btn.primaryBlock('lg')} cursor-pointer`}
                    >
                        {t(`connect.upgrade.${plan}.cta`)}
                    </a>
                )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
