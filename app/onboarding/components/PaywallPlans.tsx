"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, Gauge, Users, Wrench } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    FALLBACK_PRICING,
    TRIAL_DAYS,
    type BillingPeriod as Billing,
    type PlanId,
} from '@/lib/paddle/config';
import { PRIMARY_BUTTON_BLOCK, SECONDARY_BUTTON } from './buttonStyles';

// Prices and price ids both live in lib/paddle/config.ts — see the note there
// on which figures are confirmed and which are still placeholders.
const PLAN_PRICING = FALLBACK_PRICING;

// Derived rather than hard-coded so the badge can never drift from the prices.
const SAVINGS_PCT = Math.round((1 - PLAN_PRICING.pro.yearly / PLAN_PRICING.pro.monthly) * 100);

/**
 * The four groups every plan is described in, in the order they are read.
 *
 * Both plans answer the same four headings — Max is Pro with the ceilings taken
 * off, so it is described in the same terms rather than as a different product
 * with a different shape. Comparing them is then a matter of reading the same
 * heading twice, which is what makes showing one plan at a time affordable.
 *
 * The ids are fixed here and the copy hangs off them in the locale files, so a
 * translator reordering a list can never slide a heading onto the wrong icon.
 */
const GROUPS = [
    { id: 'tools', Icon: Wrench },
    { id: 'materials', Icon: BookOpen },
    { id: 'community', Icon: Users },
    { id: 'capacity', Icon: Gauge },
] as const;

/** Written but not shipped — rendered greyed with a "coming soon" tag. */
const PRO_SOON = ['stockholm_events'];

/**
 * The plans, and the last screen before money changes hands.
 *
 * One plan at a time. Two columns side by side made the page a comparison
 * exercise — matching lines across a gutter, each column too narrow to say
 * anything at length — when what a visitor at this point in the flow needs is
 * one plan explained properly. Max is reached by a link under the button, and
 * it answers the same four headings, so switching reads as the same page with
 * bigger numbers rather than as a second product.
 *
 * There is no money-back guarantee on this screen. A 30-day one under a 3-day
 * trial made two different promises about the same money, and only one of them
 * was ever going to be honoured. What the card is charged and when is stated
 * plainly instead, twice: on the plan and again under the button.
 *
 * Checkout is not run from here. The step that follows the CTA depends on state
 * this component has no business knowing — whether the visitor has an account
 * yet, whether Paddle is configured, whether signups are open at all — so the
 * selection is handed up to the onboarding page and it decides. That also lets
 * `?step=paywall` (the in-platform Max upgrade, where the visitor is already
 * signed in) and the onboarding flow share one component.
 */
export default function PaywallPlans({ onBack, onCheckout, isSubmitting = false, error = '' }: {
    /** Omitted when the paywall is reached directly via `?step=paywall`. */
    onBack?: () => void;
    onCheckout: (plan: PlanId, billing: Billing) => void;
    isSubmitting?: boolean;
    error?: string;
}) {
    const { t, tList } = useLanguage();
    const [billing, setBilling] = useState<Billing>('yearly');
    const [plan, setPlan] = useState<PlanId>('pro');

    const savingsBadge = t('onboarding.paywall.billing.save_badge').replace('{pct}', String(SAVINGS_PCT));
    const fill = (key: string) => t(key).replace('{days}', String(TRIAL_DAYS));

    const price = PLAN_PRICING[plan][billing];
    const outcome = tList<string>(`onboarding.paywall.plans.${plan}.outcome`);
    const other: PlanId = plan === 'pro' ? 'max' : 'pro';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            // Its own column rather than the 4xl the two-column layout needed.
            // One plan read top to bottom is a measure problem, not a width one:
            // a 900px line of feature copy is nobody's idea of readable.
            className="mx-auto max-w-2xl space-y-8"
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

            {/* The plan. Keyed on the plan id so switching remounts it and the
                new one arrives from the top — the two are the same shape and
                near enough the same length, so without that the swap is a page
                of text changing under the eye with nothing to mark it. */}
            <motion.div
                key={plan}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5 rounded-[32px] border border-stone-200/70 bg-white/70 p-7 shadow-[0_12px_45px_rgba(0,0,0,0.04)] md:p-9"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-sans font-semibold text-stone-900">
                            {t(`onboarding.paywall.plans.${plan}.name`)}
                        </span>
                        {plan === 'pro' && (
                            <span className="rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#3f6b3a]">
                                {t('onboarding.paywall.recommended')}
                            </span>
                        )}
                        {billing === 'yearly' && (
                            <span className="rounded-full bg-[#FFF35F] px-3 py-1 text-[11px] font-bold text-stone-900">
                                {savingsBadge}
                            </span>
                        )}
                    </div>

                    <p className="text-[13px] font-medium text-stone-500">
                        {t(`onboarding.paywall.plans.${plan}.tagline`)}
                    </p>

                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="text-5xl font-sans font-bold tracking-tight text-stone-900 md:text-6xl">
                            ${price}
                        </span>
                        <span className="text-[13px] font-medium text-stone-500">
                            {t(`onboarding.paywall.billing.billed_${billing}`)}
                        </span>
                    </div>

                    {/* What the card is actually charged today, beside the price
                        rather than in the fine print under the button — the
                        number above is not the number they're agreeing to yet,
                        and pretending otherwise is how trials earn their
                        reputation. */}
                    <div className="space-y-0.5">
                        <p className="text-[13px] font-bold text-[#3f6b3a]">
                            {t('onboarding.paywall.today_free')}
                        </p>
                        <p className="text-[12px] font-medium leading-snug text-stone-500">
                            {fill('onboarding.paywall.then_billed')}
                        </p>
                    </div>
                </div>

                {/* The outcome, ahead of the inventory. A list of tools answers
                    "what do I get", and the question actually being asked at
                    this point is "what happens to me if I do this". */}
                <div className="space-y-3 border-t border-stone-200/70 pt-6">
                    <h2 className="text-[17px] font-sans font-semibold text-[#363636]">
                        {t('onboarding.paywall.outcome_label')}
                    </h2>
                    {plan === 'max' && (
                        <p className="text-[13px] font-semibold text-stone-500">
                            {t('onboarding.paywall.max_intro')}
                        </p>
                    )}
                    <ul className="space-y-2.5">
                        {outcome.map((item, i) => (
                            <li
                                key={i}
                                className="flex gap-3 text-[15px] font-medium leading-snug text-[#363636]/85"
                            >
                                <Check size={16} className="mt-1 shrink-0 stroke-[2.5px] text-[#86BE7F]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* The four groups, each its own tile on the page's own cream —
                    so the panel reads as four answers rather than one long list
                    with headings dropped into it. */}
                <div className="space-y-3">
                    {GROUPS.map(({ id, Icon }) => {
                        const titleKey = `onboarding.paywall.plans.${plan}.groups.${id}.title`;
                        const title = t(titleKey);
                        const items = tList<string>(`onboarding.paywall.plans.${plan}.groups.${id}.items`);

                        // A group a plan doesn't describe is absent rather than
                        // rendered as an empty card. `t` echoes the key back
                        // when it can't resolve it, which is what that says.
                        if (title === titleKey) return null;

                        return (
                            <div
                                key={id}
                                className="flex gap-5 rounded-[24px] border border-stone-200/60 bg-[#EFF0E7] p-6"
                            >
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#86BE7F]/20 text-[#3f6b3a]">
                                    <Icon size={22} className="stroke-[1.8]" />
                                </span>

                                <div className="space-y-2.5">
                                    <h3 className="text-[18px] font-sans font-semibold text-[#363636]">
                                        {title}
                                    </h3>
                                    <ul className="space-y-2">
                                        {items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex gap-2.5 text-[14px] font-medium leading-snug text-stone-600"
                                            >
                                                <Check size={14} className="mt-1 shrink-0 stroke-[2.5px] text-stone-400" />
                                                {item}
                                            </li>
                                        ))}

                                        {/* Written but not shipped, marked as
                                            such on the line itself. It hangs
                                            off this group because that is where
                                            it belongs once it does ship. */}
                                        {id === 'community' && plan === 'pro' && PRO_SOON.map((soonId) => (
                                            <li
                                                key={soonId}
                                                className="flex gap-2.5 text-[14px] font-medium leading-snug text-stone-400"
                                            >
                                                <Check size={14} className="mt-1 shrink-0 stroke-[2.5px] text-stone-300" />
                                                <span>
                                                    {t(`onboarding.paywall.plans.pro.soon.${soonId}`)}
                                                    <span className="ml-2 whitespace-nowrap rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                                        {t('onboarding.paywall.coming_soon')}
                                                    </span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <ul className="space-y-1.5 pt-1">
                    {['no_ads', 'cancel_note'].map((id) => (
                        <li key={id} className="flex gap-2.5 text-[13px] font-semibold text-stone-600">
                            <Check size={14} className="mt-0.5 shrink-0 stroke-[2.5px] text-[#86BE7F]" />
                            {t(`onboarding.paywall.${id}`)}
                        </li>
                    ))}
                </ul>
            </motion.div>

            <div className="space-y-4">
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
                            className={SECONDARY_BUTTON}
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onCheckout(plan, billing)}
                        disabled={isSubmitting}
                        className={`${PRIMARY_BUTTON_BLOCK} grow disabled:cursor-not-allowed disabled:opacity-75`}
                    >
                        {isSubmitting ? t('onboarding.paywall.opening_checkout') : t('onboarding.paywall.cta')}
                        {!isSubmitting && <ArrowRight className="h-5 w-5 stroke-[2.75px]" />}
                    </button>
                </div>

                <div className="space-y-1 text-center">
                    <p className="text-[11px] text-stone-500">{t('onboarding.paywall.no_charge')}</p>
                    <p className="text-[11px] font-semibold text-stone-700">{fill('onboarding.paywall.reminder')}</p>
                </div>

                {/* The other plan, under the button rather than beside it. It is
                    a way to keep reading, not a second decision competing with
                    the one being asked for — so it is a line of text, and the
                    only control on this screen with no fill behind it. */}
                <button
                    type="button"
                    onClick={() => setPlan(other)}
                    className="mx-auto flex items-center gap-2 text-[14px] font-semibold text-stone-600 underline underline-offset-4 transition-colors hover:text-stone-900"
                >
                    {t(`onboarding.paywall.${plan === 'pro' ? 'see_max' : 'see_pro'}`)}
                    {plan === 'pro' ? (
                        <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                    ) : (
                        <ArrowLeft className="h-4 w-4 stroke-[2.5px]" />
                    )}
                </button>
            </div>
        </motion.div>
    );
}
