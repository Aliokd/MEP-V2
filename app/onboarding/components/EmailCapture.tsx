"use client";

import { useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
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
const CONSENT_SLOTS = /(\{terms\}|\{privacy\})/g;

// The shake used when something is missing. Same gesture as the quiz's Next
// button: a head shake, not a rejection. Driven through animation controls
// rather than a CSS class so it can replay on the second and third press —
// re-adding a class an element never lost is not a change the engine replays —
// and, unlike remounting to force that, it leaves the field's focus and caret
// exactly where the visitor left them.
const SHAKE = { x: [0, -6, 5, -4, 3, -2, 0] };
const SHAKE_TIMING = { duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] as const };

export default function EmailCapture({ initialEmail = '', isSubmitting = false, error = '', onSubmit }: {
    initialEmail?: string;
    isSubmitting?: boolean;
    /** Set by the page when the address is refused upstream. */
    error?: string;
    onSubmit: (email: string) => void;
}) {
    const { t, language } = useLanguage();
    const prefersReducedMotion = useReducedMotion();
    const [email, setEmail] = useState(initialEmail);
    const [accepted, setAccepted] = useState(false);
    // Only after a submit attempt — telling someone their half-typed address is
    // wrong while they are still typing it is noise, not help.
    const [showInvalid, setShowInvalid] = useState(false);
    const [showConsent, setShowConsent] = useState(false);

    const emailShake = useAnimationControls();
    const consentShake = useAnimationControls();

    const valid = EMAIL_PATTERN.test(email.trim());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Both are checked before either is reported, so pressing once with a
        // bad address AND no tick doesn't turn into two round trips.
        setShowInvalid(!valid);
        setShowConsent(!accepted);

        // Whatever is missing shakes — both, if both are. Nothing here is
        // styled as an error: a missing tick box is not a mistake anyone made,
        // it is a step not taken yet, and red is a strong word for that.
        if (!valid || !accepted) {
            if (!prefersReducedMotion) {
                if (!valid) emailShake.start({ ...SHAKE, transition: SHAKE_TIMING });
                if (!accepted) consentShake.start({ ...SHAKE, transition: SHAKE_TIMING });
            }
            return;
        }
        onSubmit(email.trim());
    };

    const message = error || (showInvalid && !valid ? t('onboarding.email.invalid') : '');

    // The button stays live rather than greying out until the box is ticked.
    // The control that would unlock it sits *below* it, so a dead button is a
    // puzzle — pressing and being told what's missing is the shorter path.
    const consentSentence = t('onboarding.email.consent').split(CONSENT_SLOTS).map((part, i) => {
        if (part === '{terms}') {
            return (
                <Link
                    key={i}
                    href={localizePath('/terms', language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-600"
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
                    className="font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-600"
                >
                    {t('onboarding.email.consent_privacy')}
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
            <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-stone-500">
                    {t('onboarding.email.eyebrow')}
                </p>
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                    {t('onboarding.email.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {t('onboarding.email.subtitle')}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="mx-auto max-w-md space-y-4 rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-8"
            >
                <motion.div animate={emailShake}>
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
                    className={`${PRIMARY_BUTTON_BLOCK} disabled:cursor-not-allowed disabled:opacity-70`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('onboarding.email.submitting')}
                        </>
                    ) : (
                        <>
                            {t('onboarding.email.cta')}
                            <ArrowRight className="h-5 w-5 stroke-[2.5px]" />
                        </>
                    )}
                </button>

                {/* Consent, under the button. A real gate rather than a notice:
                    a tick box that lets you through unticked records nothing
                    and protects no one. */}
                <motion.div className="space-y-1.5" animate={consentShake}>
                    <label className="flex cursor-pointer items-start gap-3 text-left">
                        {/* The native box drives state and keeps the keyboard
                            and screen-reader behaviour; the square beside it is
                            what gets drawn. `peer` links the two so focus and
                            checked styling follow the real control. */}
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => {
                                setAccepted(e.target.checked);
                                if (e.target.checked) setShowConsent(false);
                            }}
                            disabled={isSubmitting}
                            aria-describedby="consent-text"
                            className="peer sr-only"
                        />
                        <span
                            aria-hidden="true"
                            className={`mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-[7px] border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#86BE7F] peer-focus-visible:ring-offset-2 ${
                                accepted ? 'border-[#86BE7F] bg-[#86BE7F]' : 'border-stone-300 bg-white'
                            }`}
                        >
                            {accepted && <Check size={13} className="stroke-[3.5] text-stone-900" />}
                        </span>

                        <span id="consent-text" className="text-[12.5px] leading-relaxed text-stone-600">
                            {consentSentence}
                        </span>
                    </label>

                    {showConsent && !accepted && (
                        <p role="status" className="sr-only">
                            {t('onboarding.email.consent_required')}
                        </p>
                    )}
                </motion.div>
            </form>
        </motion.div>
    );
}
