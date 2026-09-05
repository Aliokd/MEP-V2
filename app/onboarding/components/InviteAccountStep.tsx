"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { PRIMARY_BUTTON_BLOCK } from './buttonStyles';

/**
 * The account step for an invited person.
 *
 * It stands where the verification code screen stands for everyone else, and
 * asks for less: the invitation reached this address, which is the check the
 * code exists to make, so the address is shown locked and the only thing to
 * add is a password. Google is offered beside it, on the condition that it is
 * the invited address — the invitation attaches to the account by email, and a
 * different address would land them in an empty workspace with no song in it.
 */
export default function InviteAccountStep({
    email,
    inviterName,
    projectTitle,
    isSubmitting = false,
    error = '',
    onCreate,
    onGoogle,
}: {
    email: string;
    inviterName: string | null;
    projectTitle: string | null;
    isSubmitting?: boolean;
    error?: string;
    onCreate: (password: string) => void;
    onGoogle: () => void;
}) {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const tooShort = password.length > 0 && password.length < 8;

    const intro = t('onboarding.invite.subtitle')
        .replace('{inviter}', inviterName || t('collab.a_collaborator'))
        .replace('{project}', projectTitle || t('workspace.untitled_note'));

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[520px] mx-auto"
        >
            <div className="text-center mb-8">
                <h1 className="text-[34px] sm:text-[40px] leading-[1.05] font-light tracking-[-0.02em] text-stone-900">
                    {t('onboarding.invite.title')}
                </h1>
                <p className="mt-4 text-[16px] leading-relaxed text-stone-600">{intro}</p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (isSubmitting || password.length < 8) return;
                    onCreate(password);
                }}
                className="bg-[#F0F0EA] rounded-[28px] p-5 sm:p-7 flex flex-col gap-4"
            >
                <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-stone-500 px-1">{t('onboarding.invite.email_label')}</span>
                    <span className="flex items-center gap-2.5 rounded-[22px] bg-white/70 border border-stone-200/80 px-5 py-4 text-[17px] text-stone-500 select-all">
                        <Lock size={15} className="shrink-0 text-stone-400" />
                        <span className="truncate">{email}</span>
                    </span>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-stone-500 px-1">{t('onboarding.invite.password_label')}</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('onboarding.invite.password_placeholder')}
                        className="w-full rounded-[22px] bg-white border border-stone-200 px-5 py-4 text-[17px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                    />
                    {tooShort && (
                        <span className="text-[12.5px] text-stone-500 px-1">{t('onboarding.invite.password_hint')}</span>
                    )}
                </label>

                {error && (
                    <p role="alert" className="flex items-start gap-2 text-[13.5px] text-red-600 px-1">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || password.length < 8}
                    className={`${PRIMARY_BUTTON_BLOCK} mt-1 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                            <span>{t('onboarding.invite.cta')}</span>
                            <ArrowRight size={18} className="stroke-[2.5]" />
                        </>
                    )}
                </button>

                <div className="flex items-center gap-3 my-1">
                    <span className="h-px flex-1 bg-stone-300/60" />
                    <span className="text-[12px] text-stone-400">{t('onboarding.invite.or')}</span>
                    <span className="h-px flex-1 bg-stone-300/60" />
                </div>

                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onGoogle}
                    className="w-full h-14 rounded-full bg-white border border-stone-200 text-[15.5px] font-medium text-stone-800 flex items-center justify-center gap-3 hover:border-stone-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.55 5.55 0 0 1-2.4 3.64v3h3.87c2.27-2.09 3.55-5.17 3.55-8.88z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
                        <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
                    </svg>
                    <span>{t('onboarding.invite.google')}</span>
                </button>

                <p className="text-center text-[12.5px] text-stone-500 mt-1">
                    {t('onboarding.invite.have_account')}{' '}
                    <Link href="/signin" className="font-semibold text-stone-800 hover:underline">{t('onboarding.invite.sign_in')}</Link>
                </p>
            </form>
        </motion.div>
    );
}
