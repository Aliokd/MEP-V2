"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    FALLBACK_PRICING,
    PLAN_IDS,
    TRIAL_DAYS,
    type BillingPeriod as Billing,
    type PlanId,
} from '@/lib/paddle/config';

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

/**
 * The plans, and the last screen before money changes hands.
 *
 * Checkout itself is not run from here. The step that follows the CTA depends
 * on state this component has no business knowing — whether the visitor has an
 * account yet, whether Paddle is configured, whether signups are open at all —
 * so the selection is handed up to the onboarding page and it decides. That
 * also means `?step=paywall` (the in-platform Max upgrade, where the visitor is
 * already signed in) and the onboarding flow can share one component.
 */
export default function PaywallPlans({ onBack, onCheckout, isSubmitting = false, error = '' }: {
    /** Omitted when the paywall is reached directly via `?step=paywall`. */
    onBack?: () => void;
    onCheckout: (plan: PlanId, billing: Billing) => void;
    isSubmitting?: boolean;
    error?: string;
}) {
    const { t } = useLanguage();
    const [billing, setBilling] = useState<Billing>('yearly');
    const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');

    const savingsBadge = t('onboarding.paywall.billing.save_badge').replace('{pct}', String(SAVINGS_PCT));
    const fill = (key: string) => t(key).replace('{days}', String(TRIAL_DAYS));

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

                                <p className="text-[13px] font-medium text-stone-500">
                                    {t(`onboarding.paywall.plans.${planId}.tagline`)}
                                </p>

                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-sans font-bold text-stone-900">${price}</span>
                                    <span className="text-xs font-medium text-stone-500">
                                        {t(`onboarding.paywall.billing.billed_${billing}`)}
                                    </span>
                                </div>

                                {/* What the card is actually charged today, on
                                    the card itself rather than in the fine print
                                    under the button — the number beside the plan
                                    name is not the number they're agreeing to
                                    yet, and pretending otherwise is how trials
                                    earn their reputation. */}
                                <div className="space-y-0.5 pt-1">
                                    <p className="text-[13px] font-bold text-[#3f6b3a]">
                                        {t('onboarding.paywall.today_free')}
                                    </p>
                                    <p className="text-[12px] font-medium leading-snug text-stone-500">
                                        {fill('onboarding.paywall.then_billed')}
                                    </p>
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

                {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-700">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label={t('onboarding.go_back')}
                            className="flex shrink-0 items-center justify-center rounded-[20px] border border-stone-300 bg-white/40 p-5 text-stone-600 shadow-sm transition-all hover:border-stone-400 hover:bg-white hover:text-stone-900"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onCheckout(selectedPlan, billing)}
                        disabled={isSubmitting}
                        className="flex flex-grow items-center justify-center gap-3 rounded-[20px] bg-[#86BE7F] py-5 text-xl font-semibold text-stone-900 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                    >
                        {isSubmitting ? t('onboarding.paywall.opening_checkout') : t('onboarding.paywall.cta')}
                        {!isSubmitting && <ArrowRight className="h-5 w-5 stroke-[2.5px]" />}
                    </button>
                </div>

                <div className="space-y-1">
                    <p className="text-[11px] text-stone-500">{t('onboarding.paywall.no_charge')}</p>
                    <p className="text-[11px] font-semibold text-stone-700">{fill('onboarding.paywall.reminder')}</p>
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
