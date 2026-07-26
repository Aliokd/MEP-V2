"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
    FALLBACK_PRICING,
    PLAN_IDS,
    getPriceId,
    isPlanPurchasable,
    type BillingPeriod as Billing,
    type PlanId,
} from '@/lib/paddle/config';
import { openCheckout } from '@/lib/paddle/checkout';

// Prices and price ids both live in lib/paddle/config.ts — see the note there
// on which figures are confirmed and which are still placeholders.
const PLAN_PRICING = FALLBACK_PRICING;

// Derived rather than hard-coded so the badge can never drift from the prices.
const SAVINGS_PCT = Math.round((1 - PLAN_PRICING.pro.yearly / PLAN_PRICING.pro.monthly) * 100);

const PLAN_ORDER: PlanId[] = PLAN_IDS;

// Bullet ids resolve to `onboarding.paywall.plans.<plan>.<group>.<id>`.
// `soon` renders greyed out with a "coming soon" tag.
const PLAN_CONTENT: Record<PlanId, { benefits: string[]; soon: string[]; features: string[] }> = {
    pro: {
        benefits: ['fundamentals', 'rhyme_lexicon', 'production', 'mind_power', 'community'],
        soon: ['stockholm_events'],
        features: ['canvas', 'tools', 'collab', 'demo_studio', 'guided_writing', 'files_backup', 'limits', 'sharing'],
    },
    max: {
        benefits: ['capacity', 'premium_songwriters', 'pro_collab', 'group_discussions', 'books'],
        soon: [],
        features: [],
    },
};

export default function PaywallPlans() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [billing, setBilling] = useState<Billing>('yearly');
    const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
    const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    const savingsBadge = t('onboarding.paywall.billing.save_badge').replace('{pct}', String(SAVINGS_PCT));

    // Until Paddle credentials and price ids are set, the CTA keeps its old
    // behaviour of dropping straight into the platform.
    const canCheckout = isPlanPurchasable(selectedPlan, billing) && Boolean(user);
    const priceId = getPriceId(selectedPlan, billing);

    const handleCheckout = async () => {
        if (!user || !priceId) return;

        setCheckoutError('');
        setIsOpeningCheckout(true);
        try {
            await openCheckout({
                priceId,
                uid: user.uid,
                email: user.email,
                locale: language,
                successUrl: `${window.location.origin}/platform/create`,
            });
        } catch (err: any) {
            console.error('Paddle checkout failed to open:', err);
            setCheckoutError(t('onboarding.paywall.checkout_error'));
        } finally {
            setIsOpeningCheckout(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
        >
            <div className="space-y-4 text-center">
                <h1 className="text-4xl font-sans font-light leading-[1.1] text-stone-900 md:text-[3.25rem]">
                    {t('onboarding.paywall.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {t('onboarding.paywall.subtitle')}
                </p>
            </div>

            {/* Billing period — yearly is the default */}
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-white/60 p-1.5">
                    {(['yearly', 'monthly'] as Billing[]).map((period) => (
                        <button
                            key={period}
                            type="button"
                            onClick={() => setBilling(period)}
                            aria-pressed={billing === period}
                            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                billing === period
                                    ? 'bg-[#363636] text-white shadow-sm'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            {t(`onboarding.paywall.billing.${period}`)}
                            {period === 'yearly' && (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                        billing === 'yearly' ? 'bg-[#FFF35F] text-stone-900' : 'bg-[#FFF35F]/70 text-stone-800'
                                    }`}
                                >
                                    {savingsBadge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plans */}
            <div className="grid gap-5 md:grid-cols-2 md:items-start">
                {PLAN_ORDER.map((planId) => {
                    const isSelected = selectedPlan === planId;
                    const content = PLAN_CONTENT[planId];
                    const price = PLAN_PRICING[planId][billing];

                    return (
                        <button
                            key={planId}
                            type="button"
                            onClick={() => setSelectedPlan(planId)}
                            aria-pressed={isSelected}
                            className={`relative flex h-full w-full flex-col gap-6 rounded-[28px] border p-7 text-left transition-all md:p-8 ${
                                isSelected
                                    ? 'border-[#86BE7F] bg-white shadow-[0_12px_45px_rgba(0,0,0,0.04)]'
                                    : 'border-stone-200/80 bg-white/50 hover:border-stone-300 hover:bg-white/80'
                            }`}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-2xl font-sans font-semibold text-stone-900">
                                        {t(`onboarding.paywall.plans.${planId}.name`)}
                                    </h3>
                                    {planId === 'pro' && (
                                        <span className="rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#3f6b3a]">
                                            {t('onboarding.paywall.recommended')}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-sans font-bold text-stone-900">${price}</span>
                                    <span className="text-xs font-medium text-stone-500">
                                        {t(`onboarding.paywall.billing.billed_${billing}`)}
                                    </span>
                                </div>
                            </div>

                            {planId === 'max' && (
                                <p className="text-sm font-semibold text-stone-700">
                                    {t('onboarding.paywall.max_intro')}
                                </p>
                            )}

                            <div className="space-y-3">
                                {planId === 'pro' && (
                                    <p className="text-xs font-semibold text-stone-500">
                                        {t('onboarding.paywall.benefits_label')}
                                    </p>
                                )}
                                <ul className="space-y-3">
                                    {content.benefits.map((id) => (
                                        <li key={id} className="flex gap-3 text-[14px] font-medium leading-snug text-[#363636]/85">
                                            <Check size={16} className="mt-0.5 shrink-0 text-[#86BE7F]" />
                                            {t(`onboarding.paywall.plans.${planId}.benefits.${id}`)}
                                        </li>
                                    ))}
                                    {content.soon.map((id) => (
                                        <li key={id} className="flex gap-3 text-[14px] font-medium leading-snug text-stone-400">
                                            <Check size={16} className="mt-0.5 shrink-0 text-stone-300" />
                                            <span>
                                                {t(`onboarding.paywall.plans.${planId}.soon.${id}`)}
                                                <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                                    {t('onboarding.paywall.coming_soon')}
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {content.features.length > 0 && (
                                <div className="space-y-3 border-t border-stone-200/70 pt-5">
                                    <p className="text-xs font-semibold text-stone-500">
                                        {t('onboarding.paywall.features_label')}
                                    </p>
                                    <ul className="space-y-2.5">
                                        {content.features.map((id) => (
                                            <li key={id} className="flex gap-3 text-[13px] leading-snug text-stone-600">
                                                <Check size={14} className="mt-0.5 shrink-0 text-stone-400" />
                                                {t(`onboarding.paywall.plans.${planId}.features.${id}`)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Guarantee + conversion CTA */}
            <div className="mx-auto max-w-md space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-stone-700">
                    <ShieldCheck size={16} className="text-[#86BE7F]" />
                    {t('onboarding.paywall.guarantee')}
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
                        onClick={handleCheckout}
                        disabled={isOpeningCheckout}
                        className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#86BE7F] py-5 text-xl font-semibold text-stone-900 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                    >
                        {isOpeningCheckout ? t('onboarding.paywall.opening_checkout') : t('onboarding.paywall.cta')}
                    </button>
                ) : (
                    <Link
                        href="/platform/create"
                        className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#86BE7F] py-5 text-xl font-semibold text-stone-900 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:opacity-95 active:scale-[0.99]"
                    >
                        {t('onboarding.paywall.cta')}
                    </Link>
                )}

                <div className="space-y-1">
                    <p className="text-[11px] text-stone-500">{t('onboarding.paywall.no_charge')}</p>
                    <p className="text-[11px] font-semibold text-stone-700">{t('onboarding.paywall.reminder')}</p>
                    <Link
                        href="/refund-policy"
                        className="inline-block text-[11px] text-stone-500 underline underline-offset-4 transition-colors hover:text-stone-800"
                    >
                        {t('onboarding.paywall.refund_policy')}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
