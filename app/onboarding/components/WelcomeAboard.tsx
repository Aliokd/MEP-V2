"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TRIAL_DAYS } from '@/lib/paddle/config';
import { PRIMARY_BUTTON_BLOCK } from './buttonStyles';

// The last screen of the flow, and the first one that isn't selling anything.
// It confirms what just happened (the trial is running, this is what it opens)
// and then gets out of the way with a single door into the product.
//
// Also reachable directly at `?step=welcome`, so it has to stand on its own
// with no state carried over from the rest of the flow.
const NEXT_STEPS = ['canvas', 'tools', 'community'] as const;

const MIN_PASSWORD = 8;

/**
 * The one thing this screen asks for, and only if wanted.
 *
 * The email step made the account with no password on purpose: a password
 * is a second decision, and asking for it there turned one field into a
 * form. But an account with no password has only one way back in, the
 * "forgot password" mail, and nobody should discover that on their second
 * visit. So the offer is made here, once the card and the code are done,
 * with nothing left to abandon. The custom-token sign-in that just happened
 * counts as recent for Firebase, which is what lets updatePassword run
 * without a re-authentication prompt.
 *
 * Only shown to accounts that can use it: signed in, through a password
 * provider rather than Google.
 */
function PasswordOffer() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const eligible = Boolean(user) && Boolean(auth.currentUser)
        && (user!.providerData ?? []).some((p) => p.providerId === 'password');
    if (!eligible) return null;

    const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser || password.length < MIN_PASSWORD || saving) return;
        setError('');
        setSaving(true);
        try {
            await updatePassword(auth.currentUser, password);
            setSaved(true);
        } catch (err: unknown) {
            console.error('Setting the password failed:', err);
            const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined;
            setError(code === 'auth/weak-password'
                ? t('onboarding.welcome.password.too_short').replace('{n}', String(MIN_PASSWORD))
                : t('onboarding.welcome.password.failed'));
        } finally {
            setSaving(false);
        }
    };

    if (saved) {
        return (
            <p role="status" className="flex items-center gap-2 text-[14px] font-medium text-stone-700">
                <Check size={16} className="stroke-[3px] text-[#3f6b3a]" />
                {t('onboarding.welcome.password.saved')}
            </p>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-3 border-t border-stone-200/70 pt-6">
            <div className="space-y-1">
                <p className="text-[15px] font-semibold text-stone-900">
                    {t('onboarding.welcome.password.title')}
                </p>
                <p className="text-[13px] leading-relaxed text-stone-600">
                    {t('onboarding.welcome.password.body')}
                </p>
            </div>
            <div className="flex gap-2">
                <div className="relative grow">
                    <input
                        type={show ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('onboarding.welcome.password.placeholder').replace('{n}', String(MIN_PASSWORD))}
                        aria-label={t('onboarding.welcome.password.title')}
                        aria-invalid={tooShort || Boolean(error)}
                        disabled={saving}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-11 text-[15px] font-medium text-stone-900 outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 focus:border-[#86BE7F] disabled:opacity-60"
                    />
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? t('onboarding.welcome.password.hide') : t('onboarding.welcome.password.show')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
                    >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={password.length < MIN_PASSWORD || saving}
                    className="shrink-0 rounded-2xl bg-[#363636] px-4 py-3 text-[14px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : t('onboarding.welcome.password.save')}
                </button>
            </div>
            {(tooShort || error) && (
                <p role="alert" className="flex items-center gap-1.5 text-[12.5px] font-medium text-red-700">
                    <AlertCircle size={14} className="shrink-0" />
                    {error || t('onboarding.welcome.password.too_short').replace('{n}', String(MIN_PASSWORD))}
                </p>
            )}
        </form>
    );
}

export default function WelcomeAboard() {
    const { t } = useLanguage();

    const fill = (key: string) => t(key).replace('{days}', String(TRIAL_DAYS));

    return (
        <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
        >
            <div className="space-y-3 text-center">
                <h1 className="text-4xl font-sans font-light leading-[1.1] tracking-tight text-stone-900 md:text-[3.5rem]">
                    {t('onboarding.welcome.title')}
                </h1>
                <p className="mx-auto max-w-md text-[15px] font-medium text-stone-700/80">
                    {fill('onboarding.welcome.subtitle')}
                </p>
            </div>

            <div className="space-y-6 rounded-[28px] border border-stone-200/60 bg-[#EFF0E7] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.015)] md:p-10">
                <p className="text-xs font-semibold text-stone-500">
                    {t('onboarding.welcome.steps_label')}
                </p>

                <ul className="space-y-4">
                    {NEXT_STEPS.map((id, i) => (
                        <motion.li
                            key={id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="flex gap-3.5"
                        >
                            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#86BE7F]/20">
                                <Check size={14} className="stroke-[3px] text-[#3f6b3a]" />
                            </span>
                            <span className="text-[15px] font-medium leading-snug text-[#363636] md:text-[16px]">
                                {t(`onboarding.welcome.steps.${id}`)}
                            </span>
                        </motion.li>
                    ))}
                </ul>

                <Link
                    href="/platform/create"
                    className={PRIMARY_BUTTON_BLOCK}
                >
                    {t('onboarding.welcome.cta')}
                    <ArrowRight className="h-5 w-5 stroke-[2.5px]" />
                </Link>

                <PasswordOffer />
            </div>
        </motion.div>
    );
}
