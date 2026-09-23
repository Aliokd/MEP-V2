"use client";

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { AlertCircle, Check, CreditCard, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authedFetch } from '@/lib/authedFetch';
import { useUserPlan } from '@/lib/useUserPlan';
import {
    FALLBACK_PRICING,
    PLAN_IDS,
    TRIAL_DAYS,
    getPriceId,
    isPlanPurchasable,
    type BillingPeriod,
    type PlanId,
} from '@/lib/paddle/config';
import { openCheckout } from '@/lib/paddle/checkout';
import * as btn from './buttonStyles';

/**
 * Shown instead of the platform once the trial has run out, or a paid
 * subscription has lapsed, and nothing else grants access.
 *
 * It is the paywall with the pitch taken out: whoever sees this has already
 * used the product, so it names the two plans, their prices, and the way
 * back in. Checkout opens Paddle's overlay on this page; the webhook writes
 * the subscription and the plan hook lets the layout through the moment it
 * lands, with nothing to reload.
 *
 * A lapsed subscriber (a card that failed, a cancellation that ran out) is
 * offered a fresh checkout rather than a resume: a cancelled subscription
 * cannot be resumed in Paddle, and a new one is what they are choosing.
 */
export default function TrialEndedScreen() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const plan = useUserPlan();
    const [period, setPeriod] = useState<BillingPeriod>('yearly');
    const [opening, setOpening] = useState<PlanId | null>(null);
    const [error, setError] = useState('');
    const [portalBusy, setPortalBusy] = useState(false);

    // A lapsed subscriber has had a plan; the trial wording would be wrong.
    const lapsed = plan.billing.hasSubscription;
    // Never started a trial: the card at checkout is what starts it, so this
    // screen is the invitation, not the bad news.
    const neverStarted = plan.access === 'unpaid' && !lapsed;
    // The first checkout carries Paddle's trial; a returning subscriber's
    // card is charged at once, so the "nothing today" line is only true once.
    const trialAhead = !lapsed;

    const choose = async (chosen: PlanId) => {
        if (!user) return;
        const priceId = getPriceId(chosen, period);
        if (!priceId) return;
        setError('');
        setOpening(chosen);
        try {
            await openCheckout({
                priceId,
                uid: user.uid,
                email: user.email,
                locale: language,
                successUrl: `${window.location.origin}/platform/create`,
            });
        } catch (err) {
            console.error('Paddle checkout failed to open:', err);
            setError(t('onboarding.paywall.checkout_error'));
        } finally {
            setOpening(null);
        }
    };

    const openPortal = async () => {
        if (portalBusy) return;
        setPortalBusy(true);
        try {
            const res = await authedFetch('/api/paddle/portal', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.url) window.open(data.url, '_blank', 'noopener');
            else setError(t('profile.billing.portal_error'));
        } catch {
            setError(t('profile.billing.portal_error'));
        } finally {
            setPortalBusy(false);
        }
    };

    const anyPurchasable = PLAN_IDS.some((id) => isPlanPurchasable(id, period));

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#E4E4DF] p-4 sm:p-6 font-sans text-stone-900">
            <div className="bg-gradient-to-b from-[#FAF9F5] via-[#F6F6F0] to-[#EBEBE3] rounded-[28px] sm:rounded-[32px] border border-stone-200/70 p-6 sm:p-10 max-w-2xl w-full shadow-[0_24px_60px_rgba(0,0,0,0.08)] flex flex-col gap-7">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl sm:text-3xl font-sans font-light text-stone-800 tracking-[-0.025em] leading-[1.2]">
                        {lapsed ? t('trial_ended.lapsed_title') : neverStarted ? t('trial_ended.start_title').replace('{days}', String(TRIAL_DAYS)) : t('trial_ended.title')}
                    </h1>
                    <p className="text-sm sm:text-[15px] text-stone-500 leading-relaxed font-medium max-w-md mx-auto">
                        {lapsed ? t('trial_ended.lapsed_body') : neverStarted ? t('trial_ended.start_body') : t('trial_ended.body')}
                    </p>
                </div>

                {/* Billing period, yearly first as everywhere else. */}
                <div className="self-center inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-white/50 p-1.5">
                    {(['yearly', 'monthly'] as BillingPeriod[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            aria-pressed={period === p}
                            className={`${btn.segment(period === p, 'sm')} cursor-pointer`}
                        >
                            {t(`onboarding.paywall.billing.${p}`)}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {PLAN_IDS.map((id) => {
                        const isUpper = id === 'max';
                        const name = isUpper ? t('trial_ended.plan_pro') : t('trial_ended.plan_base');
                        const purchasable = isPlanPurchasable(id, period);
                        const busy = opening === id;
                        return (
                            <div
                                key={id}
                                className={`rounded-[22px] border p-5 flex flex-col gap-4 ${
                                    isUpper ? 'bg-white border-stone-300/80 shadow-sm' : 'bg-white/60 border-stone-200/70'
                                }`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[17px] font-medium tracking-tight text-stone-900">{name}</p>
                                        {isUpper && (
                                            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-[#DCDDD4] leading-none">
                                                Pro
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-stone-500 leading-snug">
                                        {isUpper ? t('trial_ended.pro_tagline') : t('trial_ended.base_tagline')}
                                    </p>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-stone-900 tabular-nums">${FALLBACK_PRICING[id][period]}</span>
                                    <span className="text-xs font-medium text-stone-500">{t(`onboarding.paywall.billing.billed_${period}`)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => choose(id)}
                                    disabled={!purchasable || opening !== null}
                                    className={`${isUpper ? btn.primaryBlock('md') : btn.secondary('md')} w-full justify-center cursor-pointer disabled:cursor-not-allowed mt-auto`}
                                >
                                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} className="stroke-[2.5]" />}
                                    {busy ? t('trial_ended.opening') : t('trial_ended.choose').replace('{plan}', name)}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {trialAhead && anyPurchasable && (
                    <p className="text-center text-[12.5px] text-stone-500">
                        {t('trial_ended.trial_note').replace('{days}', String(TRIAL_DAYS))}
                    </p>
                )}

                {!anyPurchasable && (
                    <div className="flex items-start gap-2 rounded-xl border border-stone-300/60 bg-white/60 px-4 py-3 text-left text-xs text-stone-600">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{t('trial_ended.unavailable')}</span>
                    </div>
                )}

                {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-700">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 border-t border-stone-200/60">
                    {lapsed && (
                        <button type="button" onClick={openPortal} disabled={portalBusy} className={`${btn.ghost('sm')} cursor-pointer`}>
                            {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            {t('trial_ended.manage')}
                        </button>
                    )}
                    <a href="mailto:contact@veinote.com" className={`${btn.ghost('sm')} cursor-pointer`}>
                        {t('trial_ended.help')} contact@veinote.com
                    </a>
                    <button
                        type="button"
                        onClick={() => { void signOut(auth); }}
                        className={`${btn.ghost('sm')} cursor-pointer`}
                    >
                        {t('trial_ended.sign_out')}
                    </button>
                </div>
            </div>
        </div>
    );
}
