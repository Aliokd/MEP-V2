"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRIMARY_BUTTON_BLOCK } from './buttonStyles';

// The last step, and the one that actually finishes the signup.
//
// It sits after the payment on purpose: the card is taken while the visitor is
// still in the flow they came for, and the inbox round trip — the one step that
// forces them to leave the page — is spent only once they have already got what
// they came for. Somebody who bounces to their email client at this point has
// nothing left to lose by coming back.
//
// The code is six digits in six boxes rather than one field, because the shape
// of the input tells you what is expected before you read anything. Paste is
// handled across the whole row: people copy the code out of the mail rather
// than retype it, and a paste that only fills the first box is the fastest way
// to make a working screen feel broken.
const CODE_LENGTH = 6;
// How long before "didn't get it?" can be pressed again. Long enough that
// double-tapping can't fire two mails, short enough not to strand anyone.
const RESEND_COOLDOWN_S = 30;

export default function OtpVerify({ email, isSubmitting = false, error = '', onVerify, onResend, onChangeEmail }: {
    email: string;
    isSubmitting?: boolean;
    error?: string;
    onVerify: (code: string) => void;
    onResend: () => void;
    /** Back to the email step — the address is wrong more often than the code. */
    onChangeEmail?: () => void;
}) {
    const { t } = useLanguage();
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [cooldown, setCooldown] = useState(0);
    const inputs = useRef<Array<HTMLInputElement | null>>([]);

    const code = digits.join('');
    const complete = code.length === CODE_LENGTH && digits.every(Boolean);

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    // A different address means a different code. This screen stays mounted
    // while the address is being corrected — the dialog opens over it — so
    // without this, digits typed for the old address would still be sitting in
    // the boxes when the visitor came back to a code that no longer matches
    // them.
    useEffect(() => {
        setDigits(Array(CODE_LENGTH).fill(''));
    }, [email]);

    // Submitting the moment the last digit lands: the button is still there for
    // anyone who wants it, but nobody should have to press it after typing a
    // code that could only mean one thing.
    useEffect(() => {
        if (complete && !isSubmitting) onVerify(code);
        // Only when the code itself becomes complete — not on every parent
        // re-render, which would re-fire the same code repeatedly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const setDigit = (i: number, value: string) => {
        const next = [...digits];
        next[i] = value;
        setDigits(next);
    };

    const handleChange = (i: number, raw: string) => {
        const cleaned = raw.replace(/\D/g, '');
        if (!cleaned) {
            setDigit(i, '');
            return;
        }
        // One character typed into one box; anything longer is a paste and is
        // spread across the row from here.
        if (cleaned.length === 1) {
            setDigit(i, cleaned);
            inputs.current[i + 1]?.focus();
            return;
        }
        const next = [...digits];
        for (let n = 0; n < cleaned.length && i + n < CODE_LENGTH; n++) {
            next[i + n] = cleaned[n];
        }
        setDigits(next);
        inputs.current[Math.min(i + cleaned.length, CODE_LENGTH - 1)]?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) {
            // Backspace on an empty box steps back and clears, which is what
            // every code field does and what the hand expects.
            e.preventDefault();
            setDigit(i - 1, '');
            inputs.current[i - 1]?.focus();
        }
        if (e.key === 'ArrowLeft') inputs.current[i - 1]?.focus();
        if (e.key === 'ArrowRight') inputs.current[i + 1]?.focus();
    };

    const handleResend = () => {
        if (cooldown > 0 || isSubmitting) return;
        setCooldown(RESEND_COOLDOWN_S);
        setDigits(Array(CODE_LENGTH).fill(''));
        inputs.current[0]?.focus();
        onResend();
    };

    return (
        <motion.div
            key="verify"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
        >
            <div className="space-y-3 text-center">
                {/* The mark alone, in the page's own ink. The green disc behind
                    it was a badge for something that isn't a status — nothing
                    has been verified yet at the point this screen is read — and
                    a filled circle at the top of a screen whose one green thing
                    should be the button was competing with it. Drawn bigger to
                    carry the space the disc used to hold. */}
                <MailCheck size={34} className="mx-auto stroke-[1.75px] text-[#363636]" />
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.25rem]">
                    {t('onboarding.verify.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {t('onboarding.verify.subtitle')}{' '}
                    <span className="font-semibold text-stone-900">{email}</span>
                </p>
            </div>

            {/* Glass, the same pane as the email form this screen is the twin
                of — the two are the same step split across the ends of the
                flow, and the opaque cream this used to carry was the one card
                in the set that sat on the painted page rather than letting it
                through. */}
            <div className="mx-auto max-w-md space-y-5 rounded-[28px] border border-white/50 bg-white/25 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl backdrop-saturate-150 md:p-8">
                <div className="flex justify-center gap-2 sm:gap-3">
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            // The whole row is one code as far as the browser and
                            // iOS's SMS/mail autofill are concerned.
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            maxLength={CODE_LENGTH}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            onFocus={(e) => e.target.select()}
                            disabled={isSubmitting}
                            aria-label={t('onboarding.verify.digit_label').replace('{n}', String(i + 1))}
                            // Bigger, and drawn to be seen: solid white on the
                            // glass rather than sharing its translucency, a
                            // two-pixel edge instead of a hairline, and the
                            // digit itself at 30px. Six boxes are the whole
                            // interface on this screen — they are what the eye
                            // should land on when it arrives, and at 44×56 on a
                            // hairline border they read as a detail of the card
                            // rather than the thing being asked for.
                            className={`h-[60px] w-[46px] rounded-2xl border-2 bg-white text-center font-sans text-[28px] font-bold text-stone-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none transition-colors disabled:opacity-60 sm:h-[72px] sm:w-[56px] sm:text-[32px] ${
                                error
                                    ? 'border-red-400/70'
                                    : digit
                                      ? 'border-[#86BE7F]'
                                      : 'border-stone-300/80 focus:border-[#86BE7F]'
                            }`}
                        />
                    ))}
                </div>

                {error && (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-red-700">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => onVerify(code)}
                    disabled={!complete || isSubmitting}
                    // The flow's button, unmodified — same green, same offset
                    // shadow, dimmed rather than repainted while the code is
                    // short. It used to go flat grey and drop its shadow when
                    // disabled, which is most of the time this screen is on
                    // screen, so the last step of the flow was the one place
                    // the button everyone had been pressing turned into a
                    // different control.
                    className={`${PRIMARY_BUTTON_BLOCK} disabled:cursor-not-allowed disabled:opacity-70`}
                >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    {isSubmitting ? t('onboarding.verify.verifying') : t('onboarding.verify.cta')}
                </button>

                <div className="space-y-1 text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={cooldown > 0 || isSubmitting}
                        className="text-[13px] font-semibold text-stone-900 underline-offset-4 transition-colors hover:text-stone-600 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline"
                    >
                        {cooldown > 0
                            ? t('onboarding.verify.resend_in').replace('{s}', String(cooldown))
                            : t('onboarding.verify.resend')}
                    </button>

                    {onChangeEmail && (
                        <div>
                            <button
                                type="button"
                                onClick={onChangeEmail}
                                disabled={isSubmitting}
                                className="text-[13px] font-medium text-stone-500 underline-offset-4 transition-colors hover:text-stone-800 hover:underline"
                            >
                                {t('onboarding.verify.change_email')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
