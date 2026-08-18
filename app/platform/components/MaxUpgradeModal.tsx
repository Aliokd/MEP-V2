"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
    FALLBACK_PRICING,
    getPriceId,
    isPlanPurchasable,
    type BillingPeriod,
} from '@/lib/paddle/config';
import { openCheckout } from '@/lib/paddle/checkout';

// What Max is worth is already written for the onboarding paywall, so this
// reads the same list rather than forking a second copy of the same selling
// points — and stays in step when that one is rewritten.
const MAX_OUTCOME_KEY = 'onboarding.paywall.plans.max.outcome';

interface MaxUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Optional line explaining which locked feature sent the user here. */
    reason?: string;
}

/**
 * In-platform Max upsell. The onboarding paywall sells both tiers to a brand new
 * user; this one has a narrower job — a Pro user hit a Max-only surface and needs
 * to upgrade without losing their place.
 */
export default function MaxUpgradeModal({ isOpen, onClose, reason }: MaxUpgradeModalProps) {
    const { t, tList, language } = useLanguage();
    const { user } = useAuth();
    const [billing, setBilling] = useState<BillingPeriod>('yearly');
    const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    if (!isOpen || typeof document === 'undefined') return null;

    const maxOutcome = tList<string>(MAX_OUTCOME_KEY);
    const price = FALLBACK_PRICING.max[billing];
    const priceId = getPriceId('max', billing);
    const canCheckout = isPlanPurchasable('max', billing) && Boolean(user);

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
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('connect.pro.modal_title')}
                className="bg-white rounded-[24px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full max-h-[90dvh] overflow-y-auto p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200/70 flex items-center justify-center transition-colors text-stone-600 active:scale-95"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="space-y-2 pr-10">
                    <span className="inline-block rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#3f6b3a]">
                        {t('onboarding.paywall.plans.max.name')}
                    </span>
                    <h3 className="text-2xl font-sans font-light text-stone-800 tracking-[-0.025em] leading-[1.3]">
                        {t('connect.pro.modal_title')}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed font-sans font-medium">
                        {reason || t('connect.pro.modal_subtitle')}
                    </p>
                </div>

                {/* Billing period — yearly first, same default as the onboarding paywall */}
                <div className="inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-[#F6F6F0] p-1.5 self-start">
                    {(['yearly', 'monthly'] as BillingPeriod[]).map((period) => (
                        <button
                            key={period}
                            type="button"
                            onClick={() => setBilling(period)}
                            aria-pressed={billing === period}
                            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                                billing === period
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-900'
                            }`}
                        >
                            {t(`onboarding.paywall.billing.${period}`)}
                        </button>
                    ))}
                </div>

                <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-sans font-bold text-stone-900">${price}</span>
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

                {canCheckout ? (
                    <button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={isOpeningCheckout}
                        className="w-full rounded-full bg-[#86BE7F] py-4 text-base font-semibold text-stone-900 transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer"
                    >
                        {isOpeningCheckout
                            ? t('onboarding.paywall.opening_checkout')
                            : t('connect.pro.modal_cta')}
                    </button>
                ) : (
                    // Paddle price ids aren't configured yet, so there is nothing to
                    // open. Send them to the full paywall instead of a dead button.
                    <a
                        href="/onboarding?step=paywall"
                        className="w-full rounded-full bg-[#86BE7F] py-4 text-base font-semibold text-stone-900 transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer text-center block"
                    >
                        {t('connect.pro.modal_cta')}
                    </a>
                )}
            </div>
        </div>,
        document.body,
    );
}
