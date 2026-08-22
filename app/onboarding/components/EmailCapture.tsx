"use client";

import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import { FOUNDER_SPOTS_TOTAL } from '@/lib/uiFlags';
import { useFounderSpots } from '@/lib/founderSpots';
import OfferBlob from '@/components/OfferBlob';
import { PRIMARY_BUTTON_BLOCK } from './buttonStyles';

// The gate between the analysis and the verdict.
//
// It asks for one thing — an email — and it asks at the one moment the visitor
// most wants to keep going: the answers have just been read back to them and
// the result is one press away. That is the whole reason this screen sits here
// rather than at the end. It is not a form standing between someone and a
// product; it is the last step of a thing they are already doing.
//
// No password. A password is a second decision, and asking for one here would
// turn a single field into a signup. The account this creates is unverified and
// stays that way until the code at the end of the flow, which is the step that
// actually finishes it.
//
// Deliberately says what it will and won't do with the address, inline and
// unhidden, because the one honest objection to a screen like this is "why do
// you want this" and the answer costs a sentence.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The consent line is one translated sentence with two links inside it, not
// three fragments concatenated — word order around "Terms" and "Privacy"
// differs by language, and gluing pieces together in English order produces
// something no Norwegian or Swedish reader would write. The string owns the
// order via {terms} and {privacy}; this splits on those and drops the links in.
const CONSENT_SLOTS = /(\{terms\}|\{privacy\}|\{cookies\})/g;

// The shake used when something is missing. Same gesture as the quiz's Next
// button: a head shake, not a rejection. Driven through animation controls
// rather than a CSS class so it can replay on the second and third press —
// re-adding a class an element never lost is not a change the engine replays —
// and, unlike remounting to force that, it leaves the field's focus and caret
// exactly where the visitor left them.
const SHAKE = { x: [0, -6, 5, -4, 3, -2, 0] };
const SHAKE_TIMING = { duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] as const };

// The founders spot counter is the same one the homepage's urgency section
// shows — see FOUNDER_SPOTS_TAKEN in lib/uiFlags.ts, which both read.
//
// Shown at rest here rather than counted up to: the number is a fact about the
// list, and animating it from somewhere else made the dialog's own opening
// frames say something untrue. The homepage still counts up, because there it
// is a reveal as the section scrolls into view rather than the answer to a
// question someone just asked.

export default function EmailCapture({ initialEmail = '', isSubmitting = false, error = '', changing = false, waitlist = false, onSubmit }: {
    initialEmail?: string;
    isSubmitting?: boolean;
    /** Set by the page when the address is refused upstream. */
    error?: string;
    /**
     * The campaign flow's framing: the address joins the waitlist rather than
     * creating an account, so "First, create your account" would be describing
     * a step that isn't happening. Same form, same consent gate — only the
     * words over it change.
     */
    waitlist?: boolean;
    /**
     * Reached from the code screen rather than from the analysis — the address
     * already exists and is being corrected, not given for the first time.
     *
     * Same form, different framing: the account is not being created here, so
     * the eyebrow announcing the plan and the "first, create your account"
     * headline would both be describing a step that already happened. It asks
     * the one question it actually needs, and its button says what pressing it
     * does — change the address and go back for the new code.
     */
    changing?: boolean;
    onSubmit: (email: string) => void;
}) {
    const { t, language } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    // Live: the anchor plus every real signup since the counter went live.
    const spotsTaken = useFounderSpots();
    const [email, setEmail] = useState(initialEmail);
    // Only after a submit attempt — telling someone their half-typed address is
    // wrong while they are still typing it is noise, not help.
    const [showInvalid, setShowInvalid] = useState(false);
    const emailShake = useAnimationControls();

    const valid = EMAIL_PATTERN.test(email.trim());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowInvalid(!valid);
        if (!valid) {
            if (!prefersReducedMotion) {
                emailShake.start({ ...SHAKE, transition: SHAKE_TIMING });
            }
            return;
        }
        onSubmit(email.trim());
    };

    const message = error || (showInvalid && !valid ? t('onboarding.email.invalid') : '');

    // Consent by continuing, not by tick box — pressing the button IS the
    // agreement, and the sentence under it says so. The box this replaced
    // gated nothing a passive line doesn't: it let you through the moment you
    // ticked it, and everyone ticked it.
    const consentSentence = t('onboarding.email.consent').split(CONSENT_SLOTS).map((part, i) => {
        if (part === '{terms}') {
            return (
                <Link
                    key={i}
                    href={localizePath('/terms', language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-stone-900 hover:text-stone-600"
                >
                    {t('onboarding.email.consent_terms')}
                </Link>
            );
        }
        if (part === '{privacy}') {
            return (
                <Link
                    key={i}
                    href={localizePath('/privacy', language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-stone-900 hover:text-stone-600"
                >
                    {t('onboarding.email.consent_privacy')}
                </Link>
            );
        }
        if (part === '{cookies}') {
            return (
                // The privacy policy is where cookie use is described and where
                // the cookie-settings control lives — there is no separate
                // cookies page to point at.
                <Link
                    key={i}
                    href={localizePath('/privacy', language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-stone-900 hover:text-stone-600"
                >
                    {t('onboarding.email.consent_cookies')}
                </Link>
            );
        }
        return <span key={i}>{part}</span>;
    });

    return (
        <motion.div
            key="email"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
        >
            {/* The campaign variant carries its headline inside the card — see
                below — so the page-level header belongs to the other two
                framings only. */}
            {!(waitlist && !changing) && (
            <div className="space-y-3 text-center">
                {/* No eyebrow when correcting an address: "your initial plan is
                    ready" is news, and it was already delivered the first time
                    through. */}
                {!changing && (
                    <p className="text-sm font-medium text-stone-500">
                        {t('onboarding.email.eyebrow')}
                    </p>
                )}
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                    {t(changing ? 'onboarding.email.change_title' : 'onboarding.email.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {t(changing ? 'onboarding.email.change_subtitle' : 'onboarding.email.subtitle')}
                </p>
            </div>
            )}

            <form
                onSubmit={handleSubmit}
                noValidate
                // Two skins for one form. The campaign variant borrows the
                // homepage urgency section's own surface — the #EDFF8E card,
                // an offer blob in the corner — so the dialog reads as that
                // section continuing here. `isolate` gives the blob a stacking
                // context to sit behind the content in (-z-10 without it drops
                // behind the card's background entirely). The other framings
                // keep the glass: a translucent panel over the frozen analysis
                // behind it, matching AnalyzingAnswers and TrialOffer.
                className={waitlist && !changing
                    ? 'relative isolate mx-auto max-w-lg space-y-5 overflow-hidden rounded-[28px] border border-white/40 bg-[#EDFF8E]/50 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 md:space-y-6 md:p-9'
                    : 'mx-auto max-w-md space-y-6 rounded-[28px] border border-white/50 bg-white/25 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:space-y-7 md:p-8'}
            >
                {/* The campaign card's own front matter: the headline and the
                    offer under it, then the founders spot counter the visitor
                    may recognise from the homepage's urgency section — same
                    numbers, same motion, at dialog scale — and the offer clock
                    in small print. The blob wears the discount the way the
                    homepage's corner wears "100% free access". */}
                {waitlist && !changing && (
                    <>
                        <OfferBlob className="absolute -bottom-9 -left-9 -z-10 w-28 -rotate-12 md:w-32" />

                        <div className="space-y-3 text-center md:space-y-4">
                            {/* The offer clock isn't here — it sits on top of
                                the card instead; see the dialog in the
                                onboarding page. */}
                            <h1 className="text-4xl font-sans font-medium leading-[1.05] tracking-tight text-stone-900 md:text-[3.25rem]">
                                {t('onboarding.waitlist.email_title')}
                            </h1>
                            <p className="mx-auto max-w-md text-[15px] font-medium leading-relaxed text-stone-700 md:text-base">
                                {t('onboarding.waitlist.email_offer')}
                            </p>
                        </div>

                        <div className="space-y-3 text-center">
                            <div className="mx-auto h-2.5 w-full max-w-sm overflow-hidden rounded-full" style={{ background: '#D5E776' }}>
                                <div
                                    className="h-full rounded-full bg-stone-900"
                                    style={{ width: `${(spotsTaken / FOUNDER_SPOTS_TOTAL) * 100}%`, transition: 'width 0.8s cubic-bezier(0.33, 1, 0.68, 1)' }}
                                />
                            </div>
                            <div className="flex items-baseline justify-center gap-1 leading-none">
                                <span className="text-6xl font-bold tracking-tighter tabular-nums text-stone-900">
                                    {spotsTaken}
                                </span>
                                <span className="text-3xl font-light tracking-tight text-stone-900/60">
                                    /{FOUNDER_SPOTS_TOTAL}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* On the campaign card the controls sit narrower than the
                    card, homepage-style, which also keeps them clear of the
                    blob in the corner. */}
                <motion.div animate={emailShake} className={waitlist && !changing ? 'mx-auto w-full max-w-sm' : undefined}>
                    <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (showInvalid) setShowInvalid(false);
                        }}
                        placeholder={t('onboarding.email.placeholder')}
                        aria-label={t('onboarding.email.placeholder')}
                        aria-invalid={Boolean(message)}
                        disabled={isSubmitting}
                        className="w-full rounded-[20px] border border-stone-200 bg-white px-6 py-4 text-lg font-medium text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-[#86BE7F] disabled:opacity-60"
                    />
                </motion.div>

                {/* Announced, not shown. The shake is the whole visible reply —
                    a sentence under the field said the same thing twice and
                    turned a nudge into a telling-off. It stays in the DOM for
                    screen readers, which cannot see a field move. */}
                {message && (
                    <p role="status" className="sr-only">{message}</p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${PRIMARY_BUTTON_BLOCK} disabled:cursor-not-allowed disabled:opacity-70 ${waitlist && !changing ? 'mx-auto max-w-sm' : ''}`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('onboarding.email.submitting')}
                        </>
                    ) : (
                        <>
                            {t(changing ? 'onboarding.email.change_cta' : waitlist ? 'onboarding.waitlist.email_submit' : 'onboarding.email.cta')}
                            <ArrowRight className="h-5 w-5 stroke-[2.5px]" />
                        </>
                    )}
                </button>
                {/* Under the button, every variant: agreement happens by
                    continuing. See consentSentence above for what the line
                    links to. */}
                <p className={`text-center text-xs leading-relaxed text-stone-600 ${waitlist && !changing ? 'mx-auto w-full max-w-sm' : ''}`}>
                    {consentSentence}
                </p>
            </form>
        </motion.div>
    );
}
