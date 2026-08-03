"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, Gauge, Lock, MicVocal, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    FALLBACK_PRICING,
    TRIAL_DAYS,
    isPlanPurchasable,
    type BillingPeriod as Billing,
    type PlanId,
} from '@/lib/paddle/config';
import { CHECKOUT_FRAME_CLASS } from '@/lib/paddle/checkout';
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
    // A studio mic rather than a wrench: what this group unlocks is the demo
    // studio, the tuner and the tempo tap — a place to make sound, not a
    // toolbox.
    { id: 'tools', Icon: MicVocal },
    { id: 'materials', Icon: BookOpen },
    { id: 'community', Icon: Users },
    { id: 'capacity', Icon: Gauge },
] as const;

/**
 * The headline's emphasis is marked in the locale string, `**like this**`, and
 * split out here.
 *
 * It belongs to the copy rather than the markup because which words carry the
 * offer is a property of the sentence, and the sentence is different in every
 * language — "3 days of premium" and "3 dagar med premiumåtkomst" do not sit in
 * the same place, or span the same number of words, as their English
 * counterpart. A translator moves the marks with the words; nothing here has to
 * know what they wrapped.
 */
const splitEmphasis = (text: string) => text.split('**');

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
export default function PaywallPlans({ onBack, onCheckout, onSkipCheckout, isSubmitting = false, error = '' }: {
    /** Omitted when the paywall is reached directly via `?step=paywall`. */
    onBack?: () => void;
    onCheckout: (plan: PlanId, billing: Billing) => void;
    /**
     * The way on when there is no checkout to run — signups closed, Paddle not
     * configured, no price id. The preview panel below offers it as a button so
     * the flow stays walkable end to end without a payment processor.
     */
    onSkipCheckout?: () => void;
    isSubmitting?: boolean;
    error?: string;
}) {
    const { t, tList } = useLanguage();
    const [billing, setBilling] = useState<Billing>('yearly');
    const [plan, setPlan] = useState<PlanId>('pro');
    /**
     * Whether the payment section is open, and for which plan.
     *
     * Paying happens on this page rather than in an overlay over it: the plan
     * stays above the card form, so what is being bought is still readable
     * while the card is typed. Held as the plan id rather than a flag so that
     * switching plans while it is open re-opens it against the new one instead
     * of leaving a form for the plan they just navigated away from.
     */
    const [checkingOut, setCheckingOut] = useState<PlanId | null>(null);
    const checkoutRef = useRef<HTMLDivElement>(null);

    /**
     * The action bar's own height, kept in state so an in-flow spacer can
     * reserve exactly that much room.
     *
     * The bar itself is portalled straight to `document.body` below — true
     * `position: fixed`, edge to edge of the actual viewport, not just of
     * whatever column it was written inside. That is a deliberate departure
     * from `position: fixed`'s usual behaviour here: this page's root is a
     * `motion.div` animating `y`, and Framer Motion drives that through a CSS
     * transform, which for as long as that transform is anything other than
     * `none` — including its own rest state, `translateY(0px)` — makes this
     * component the containing block for any fixed descendant. A bar fixed
     * inside the normal tree would still be boxed in by that ancestor's own
     * width and position, which is exactly the gap the wireframe was pointing
     * at. Escaping the tree with a portal is what actually reaches the screen.
     *
     * Once it is outside the tree, the document no longer knows to leave room
     * for it — nothing would push the last inches of scrollable content out
     * from under it. The spacer at the very end of the column is that room,
     * measured rather than guessed so it holds exactly if the bar wraps to two
     * lines on a narrow phone or the browser's UI chrome changes its height.
     */
    const [barHeight, setBarHeight] = useState(0);
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = barRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setBarHeight(entry.contentRect.height));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const savingsBadge = t('onboarding.paywall.billing.save_badge').replace('{pct}', String(SAVINGS_PCT));
    const title = t('onboarding.paywall.title').replace('{days}', String(TRIAL_DAYS));

    const price = PLAN_PRICING[plan][billing];
    const outcome = tList<string>(`onboarding.paywall.plans.${plan}.outcome`);
    const other: PlanId = plan === 'pro' ? 'max' : 'pro';
    const purchasable = isPlanPurchasable(plan, billing);

    /**
     * Opens the payment section and takes the visitor to it.
     *
     * The frame has to exist before Paddle is asked to render into it — it
     * looks its target up once and does not retry — so the section is mounted
     * on this press and `onCheckout` is called from the effect below, after the
     * paint that put it on the page.
     */
    const startCheckout = () => setCheckingOut(plan);

    useEffect(() => {
        if (!checkingOut) return;

        // Scrolled to rather than jumped to. The plan above it does not move,
        // which is the point of paying in place: the thing being bought is
        // still on screen, just above the form.
        checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (purchasable) onCheckout(checkingOut, billing);
        // Deliberately not watching `onCheckout` — the page hands a fresh arrow
        // function on every render, and depending on it would re-open the
        // checkout on each one.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkingOut, billing, purchasable]);

    // Switching plans with the form open re-opens it against the new plan; the
    // section is about a specific price, and leaving it showing the old one is
    // how somebody pays for the plan they just navigated away from.
    const choosePlan = (next: PlanId) => {
        setPlan(next);
        setCheckingOut((open) => (open ? next : null));
    };

    /**
     * What the one fixed button does, and says, at each stage.
     *
     * It is a single control doing three different jobs in sequence rather
     * than a button that opens the section and a second "Continue" living
     * inside it — the placeholder card used to carry its own, and having both
     * on screen at once was the same next step offered twice, a few inches
     * apart. Now there is exactly one place to press, and it relabels itself
     * as what pressing it would do changes.
     *
     * - Nothing opened yet: "Try for $0.00" opens the payment section.
     * - Opened, and there is a real card form to fill in (Paddle is live and
     *   this plan is purchasable): the form owns its own submit control, and
     *   this button has nothing honest left to do — wiring it to skip ahead
     *   here would be a live "Continue" that actually bypasses payment, so it
     *   steps aside rather than staying lit.
     * - Opened, and there is nothing to fill in (the preview placeholder,
     *   which is what this environment shows without Paddle configured):
     *   "Continue" is the way past a step that was never going to charge
     *   anyone, and it is what `onSkipCheckout` is for.
     */
    const showForm = checkingOut && purchasable;
    const showPlaceholder = checkingOut && !purchasable;
    const barAction = showPlaceholder
        ? { label: t('onboarding.paywall.checkout_continue'), onClick: onSkipCheckout }
        : { label: isSubmitting ? t('onboarding.paywall.opening_checkout') : t('onboarding.paywall.cta'), onClick: startCheckout };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            // No width cap of its own any more — it fills whatever `main` gives
            // it (max-w-4xl on this step). The plan card and the checkout card
            // below each carry their own max-w-2xl instead, which is what a
            // 900px line of feature copy actually needed; the action bar and
            // the Max/Pro switch do not, and capping the whole column to 2xl
            // was capping them along with it, leaving the gap on either side of
            // the buttons that the wireframe was flagging.
            className="space-y-8"
        >
            {/* One line now, not a headline plus a subtitle. The two used to
                say the same thing twice — "start your transformation" and then
                the actual facts underneath it — so the vague line is gone and
                what is left states the offer itself: 3 days, premium, free. */}
            {/* Capped at the width of the card underneath rather than running
                the full column. A headline this size on a wide monitor sets a
                line long enough that the eye has to travel back across the
                whole page to find the start of the next one — the measure that
                works for the plan below works for the line announcing it, and
                the two now break against the same edge. */}
            <h1 className="mx-auto max-w-2xl text-center text-4xl font-sans font-light leading-[1.15] text-stone-900 md:text-[3.25rem]">
                {splitEmphasis(title).map((part, i) =>
                    // Odd runs are what sat between the marks.
                    i % 2 === 1 ? (
                        <strong key={i} className="font-semibold">{part}</strong>
                    ) : (
                        part
                    ),
                )}
            </h1>

            {/* The plan. Keyed on the plan id so switching remounts it and the
                new one arrives from the top — the two are the same shape and
                near enough the same length, so without that the swap is a page
                of text changing under the eye with nothing to mark it. */}
            <motion.div
                key={plan}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                // Glass, like the analysis card and the trial timeline: a pane
                // of white held at a quarter, blurred, with a lit edge. The
                // painted page is what makes it work — an opaque panel over
                // that backdrop is a card sitting on a photograph, and the
                // whole flow is built to let the picture through everything
                // that isn't type.
                //
                // Its own max-w-2xl now that the column above it has none —
                // a card of feature copy at 4xl is a line length nobody reads
                // comfortably, even though the action bar below it is meant to
                // run the full width the column allows.
                className="mx-auto w-full max-w-2xl space-y-5 rounded-[32px] border border-white/60 bg-white/70 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:p-9"
            >
                <div className="space-y-4">
                    {/* Name and the billing toggle share the top of the card
                        rather than the toggle sitting in its own centred row
                        above it — a control this small doesn't need a row to
                        itself, and "which plan" and "how billed" are two
                        readings of the same decision, worth having in one
                        glance. `items-start` rather than `items-center`: the
                        toggle is a fixed-height pill and the name group can
                        wrap to two lines on a narrow phone, and centering
                        would drag the toggle down to split the difference. */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Bold and a size up from the tagline under it —
                                which plan this is should read before which
                                plan does what. */}
                            <span className="text-3xl font-sans font-bold tracking-tight text-stone-900 md:text-4xl">
                                {t(`onboarding.paywall.plans.${plan}.name`)}
                            </span>
                            {plan === 'pro' && (
                                <span className="rounded-full bg-[#86BE7F]/20 px-3 py-1 text-[11px] font-bold text-[#3f6b3a]">
                                    {t('onboarding.paywall.recommended')}
                                </span>
                            )}
                        </div>

                        {/* The saving is said once, here, rather than twice —
                            it used to repeat as a second badge beside
                            "Popular", which was the same fact stated a second
                            time a few inches away rather than a second fact. */}
                        <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/60 bg-white/65 p-1 backdrop-blur-2xl backdrop-saturate-150">
                            {(['yearly', 'monthly'] as Billing[]).map((period) => (
                                <button
                                    key={period}
                                    type="button"
                                    onClick={() => setBilling(period)}
                                    aria-pressed={billing === period}
                                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                                        billing === period
                                            ? 'bg-[#363636] text-white shadow-sm'
                                            : 'text-stone-600 hover:text-stone-900'
                                    }`}
                                >
                                    {t(`onboarding.paywall.billing.${period}`)}
                                    {period === 'yearly' && (
                                        <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
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
                </div>

                {/* The outcome, ahead of the inventory. A list of tools answers
                    "what do I get", and the question actually being asked at
                    this point is "what happens to me if I do this". */}
                <div className="space-y-3 border-t border-white/50 pt-6">
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
                        // Written but not shipped. Each group carries its own,
                        // rather than one flat list on the plan pinned to a
                        // hard-coded group — a line that isn't live yet belongs
                        // beside the shipped lines it will join, and which
                        // group that is should be the copy's decision.
                        const soon = tList<string>(`onboarding.paywall.plans.${plan}.groups.${id}.soon`);

                        // A group a plan doesn't describe is absent rather than
                        // rendered as an empty card. `t` echoes the key back
                        // when it can't resolve it, which is what that says.
                        if (title === titleKey) return null;

                        return (
                            <div
                                key={id}
                                // A second pane inside the first. No blur of
                                // its own — the panel behind it is already
                                // blurring the page, so this only has to be one
                                // step lighter than what it sits on to read as
                                // a tile rather than a paragraph.
                                className="flex gap-5 rounded-[24px] border border-white/50 bg-white/55 p-6"
                            >
                                {/* The mark alone, in the page's ink. The green
                                    tile behind it read as a status chip on a
                                    list of things that have no status, and four
                                    of them stacked down the card put four
                                    filled shapes in a column beside four
                                    headings that were already doing the work. */}
                                <Icon size={26} className="mt-0.5 shrink-0 stroke-[1.75px] text-[#363636]" />

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

                                        {/* Not shipped yet, and marked as such
                                            on the line itself — greyed, and
                                            tagged, so it can sit among the
                                            live lines without being read as
                                            one of them. */}
                                        {soon.map((item, i) => (
                                            <li
                                                key={`soon-${i}`}
                                                className="flex gap-2.5 text-[14px] font-medium leading-snug text-stone-400"
                                            >
                                                <Check size={14} className="mt-1 shrink-0 stroke-[2.5px] text-stone-300" />
                                                <span>
                                                    {item}
                                                    <span className="ml-2 whitespace-nowrap rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
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

            {/* The action, pinned to the bottom of the actual screen — not the
                column, the viewport. This page is now one long column — four
                feature tiles and an outcome list — and a button at the end of
                it is a button nobody has seen since they started reading. It
                rides along instead, so the decision is available from the
                first line to the last, and it runs edge to edge with nothing
                held back on either side or beneath it.

                Portalled to `document.body` rather than left in place. See the
                note by `barHeight` above: this page's root animates through a
                CSS transform, which makes it the containing block for any
                `position: fixed` element inside it, so a bar left in the tree
                would still be boxed into that ancestor's own width — the exact
                gap this replaced. Escaping to the body is what actually
                reaches the true edges of the screen.

                It carries the page's own colour, held translucent and blurred
                behind, exactly like the quiz's controls: the paywall sits on
                the painted backdrop, and a bar that is transparent over a
                landscape is a bar you cannot read the fine print on. */}
            {typeof document !== 'undefined' && createPortal(
                <div
                    ref={barRef}
                    className="fixed inset-x-0 bottom-0 z-40 space-y-3 rounded-t-[32px] bg-[#DCDDD4]/45 px-4 pb-4 pt-4 backdrop-blur-2xl backdrop-saturate-150 sm:px-6"
                >
                    {error && (
                        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-700">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Capped at the same 4xl `main` allows, so a wide desktop
                        window doesn't stretch the button into a single hairline
                        across the whole monitor — the bar's background still
                        runs the full screen, only the controls inside it hold a
                        sane width.

                        Absent rather than relabelled once a real card form is
                        showing — see `barAction` above for why. The bar itself
                        stays mounted so the back button and the reassurance
                        line under it don't jump the layout the moment the form
                        appears; only the one control with nothing honest left
                        to say steps out. */}
                    {!showForm && (
                        <div className="mx-auto flex max-w-4xl items-center gap-3">
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
                                onClick={barAction.onClick}
                                disabled={isSubmitting}
                                className={`${PRIMARY_BUTTON_BLOCK} grow disabled:cursor-not-allowed disabled:opacity-75`}
                            >
                                {barAction.label}
                                {!isSubmitting && <ArrowRight className="h-5 w-5 stroke-[2.75px]" />}
                            </button>
                        </div>
                    )}

                    {/* Rides with the button. What the card is charged and when
                        is the one thing that must never be further away than
                        the control that agrees to it. One line now rather than
                        two — the trial length and the reminder used to be
                        spelled out here on their own line; both are said
                        plainly enough already, on the timeline screen this flow
                        just came from, so this only has to answer the one
                        question left: does leaving cost anything. */}
                    <p className="text-center text-[11px] font-semibold text-stone-700">
                        {t('onboarding.paywall.no_charge')}
                    </p>
                </div>,
                document.body,
            )}

            {/* Payment, on this page rather than over it. Paddle's overlay put
                a modal on top of the plan and took the page away; here the card
                form is the next section down, so the plan it belongs to is
                still above it and scrolling back to check what you're buying
                costs nothing.

                Mounted only once asked for. An empty frame sitting under every
                paywall is a section that means nothing until it does, and
                Paddle measures its target the moment it renders — a hidden one
                would be measured at zero. */}
            {checkingOut && (
                <motion.div
                    ref={checkoutRef}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto w-full max-w-2xl scroll-mt-6 space-y-4 rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:p-8"
                >
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-[19px] font-sans font-semibold text-[#363636]">
                            {t('onboarding.paywall.checkout_title')}
                        </h2>
                        <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-stone-500">
                            <Lock size={13} className="stroke-[2.5px]" />
                            {t('onboarding.paywall.checkout_secure')}
                        </span>
                    </div>

                    {/* What Paddle renders into. Always in the tree while the
                        section is open, purchasable or not — the placeholder
                        below sits beside it rather than in its place, so the
                        target can never be missing at the moment Paddle looks
                        for it. */}
                    <div className={CHECKOUT_FRAME_CLASS} />

                    {/* No price id, no Paddle key, or signups closed: there is
                        nothing to render into the frame above. Rather than an
                        empty box, say so — and offer the way on, so the rest of
                        the flow can still be walked before payments are live.

                        Deliberately NOT a mock card form. A fake set of card
                        fields is indistinguishable from a real one to anyone
                        who lands on it, and a page that looks like it takes
                        card numbers but doesn't is the one thing this screen
                        must never be.

                        Says how to move on, but doesn't offer its own button
                        for it any more — that lives in the fixed bar now,
                        which relabels itself to "Continue" the moment this
                        card is what's showing. Two controls promising the same
                        next step a few inches apart was the thing worth fixing
                        here. */}
                    {!purchasable && (
                        <div className="space-y-3 rounded-[24px] border border-dashed border-stone-300/80 bg-white/60 p-6 text-center">
                            <p className="text-[15px] font-semibold text-[#363636]">
                                {t('onboarding.paywall.checkout_unavailable')}
                            </p>
                            <p className="mx-auto max-w-sm text-[13px] font-medium leading-relaxed text-stone-600">
                                {t('onboarding.paywall.checkout_unavailable_note')}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* The other plan, under the pinned bar rather than in it. It is a
                way to keep reading, not a second decision competing with the one
                being asked for — so it stays at the end of the page, and it is
                the only control on this screen with no fill behind it. */}
            <button
                type="button"
                onClick={() => choosePlan(other)}
                className="mx-auto flex items-center gap-2 text-[14px] font-semibold text-stone-900 underline underline-offset-4 transition-colors hover:text-stone-600"
            >
                {t(`onboarding.paywall.${plan === 'pro' ? 'see_max' : 'see_pro'}`)}
                {plan === 'pro' ? (
                    <ArrowRight className="h-4 w-4 stroke-[2.5px]" />
                ) : (
                    <ArrowLeft className="h-4 w-4 stroke-[2.5px]" />
                )}
            </button>

            {/* Reserves the room the fixed bar takes out of the document, at
                the very end of the column rather than partway up it.

                It used to sit between the plan card and the checkout section,
                which is what opened the gap between those two boxes: a spacer
                the height of the whole bar, in the middle of the page, holding
                them apart for no reason anyone reading could see. The room is
                only ever needed at the bottom — so the last thing on the page
                can scroll out from under the bar — so that is where it goes.

                Measured rather than guessed, so it still holds exactly if the
                bar wraps to two lines on a narrow phone. */}
            <div style={{ height: barHeight }} aria-hidden="true" />
        </motion.div>
    );
}
