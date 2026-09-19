"use client";

import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import * as btn from '@/app/platform/components/buttonStyles';

/** Same floor as the password offered at the end of onboarding. */
const MIN_PASSWORD = 8;

/**
 * Change password, as a row in Settings that opens into a two-field form.
 *
 * Firebase only changes a password for a session that signed in recently, so
 * the current password is asked for and used to re-authenticate first; that
 * is also what keeps someone at an unlocked laptop from setting a new one.
 * An account that never set a password (the onboarding email step makes the
 * account without one) will not know a "current" password, so the reset
 * link is offered beside the form: it goes to the address on the account,
 * and the sign-in page's reset flow takes it from there.
 *
 * Google-only accounts have no password provider, and are told so instead
 * of being shown a form that cannot work.
 */
export default function PasswordSection({
    t,
    isMockUser,
}: {
    t: (key: string) => string;
    isMockUser: boolean;
}) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

    const providers = (user?.providerData ?? []).map(p => p.providerId);
    const hasPassword = isMockUser || providers.includes('password');
    const email = user?.email ?? '';

    const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
    const canSave = current.length > 0 && next.length >= MIN_PASSWORD && !busy;

    const reset = () => {
        setCurrent('');
        setNext('');
        setShow(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave) return;
        setBusy(true);
        setNotice(null);
        try {
            if (!isMockUser) {
                const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
                const { auth } = await import('@/lib/firebase');
                if (!auth.currentUser || !email) throw new Error('no-user');
                await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(email, current));
                await updatePassword(auth.currentUser, next);
            }
            reset();
            setOpen(false);
            setNotice({ tone: 'ok', text: t('profile.password_saved') });
        } catch (err: unknown) {
            const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined;
            console.error('[settings] password change failed:', code ?? err);
            setNotice({
                tone: 'error',
                text:
                    code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials'
                        ? t('profile.password_wrong')
                        : code === 'auth/weak-password'
                          ? t('profile.password_too_short').replace('{n}', String(MIN_PASSWORD))
                          : code === 'auth/too-many-requests'
                            ? t('profile.password_too_many')
                            : t('profile.password_failed'),
            });
        } finally {
            setBusy(false);
        }
    };

    /** The same mail the sign-in page sends from "Forgot password?". */
    const sendResetLink = async () => {
        if (busy || !email) return;
        setBusy(true);
        setNotice(null);
        try {
            if (!isMockUser) {
                const { sendPasswordResetEmail } = await import('firebase/auth');
                const { auth } = await import('@/lib/firebase');
                await sendPasswordResetEmail(auth, email, {
                    url: `${window.location.origin}/reset-password`,
                    handleCodeInApp: true,
                });
            }
            reset();
            setOpen(false);
            setNotice({ tone: 'ok', text: t('profile.password_reset_sent').replace('{email}', email) });
        } catch (err) {
            console.error('[settings] reset link failed:', err);
            setNotice({ tone: 'error', text: t('profile.password_reset_failed') });
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] font-medium text-stone-900 outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 focus:border-[#86BE7F] disabled:opacity-60';

    return (
        <div className="py-4 border-b border-stone-200/60 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <p className="font-sans text-sm font-medium text-stone-800">{t('profile.password_title')}</p>
                    <p className="text-[13px] text-stone-600">
                        {hasPassword ? t('profile.password_desc') : t('profile.password_desc_google')}
                    </p>
                </div>
                {hasPassword && !open && (
                    <button
                        type="button"
                        onClick={() => { setOpen(true); setNotice(null); }}
                        className={`${btn.secondary('sm')} ml-4 shrink-0 whitespace-nowrap cursor-pointer`}
                    >
                        <KeyRound size={14} />
                        {t('profile.password_change')}
                    </button>
                )}
            </div>

            {hasPassword && open && (
                <form onSubmit={handleSave} className="space-y-3 max-w-md" data-password-form>
                    <input
                        type={show ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        placeholder={t('profile.password_current')}
                        aria-label={t('profile.password_current')}
                        disabled={busy}
                        className={field}
                    />
                    <div className="relative">
                        <input
                            type={show ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            placeholder={t('profile.password_new').replace('{n}', String(MIN_PASSWORD))}
                            aria-label={t('profile.password_new').replace('{n}', String(MIN_PASSWORD))}
                            aria-invalid={tooShort}
                            disabled={busy}
                            className={`${field} pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShow(v => !v)}
                            aria-label={show ? t('onboarding.welcome.password.hide') : t('onboarding.welcome.password.show')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700 cursor-pointer"
                        >
                            {show ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                    {tooShort && (
                        <p className="text-[12.5px] font-medium text-red-700">
                            {t('profile.password_too_short').replace('{n}', String(MIN_PASSWORD))}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button type="submit" disabled={!canSave} className={`${btn.primary('sm')} cursor-pointer disabled:cursor-not-allowed`}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                            {t('profile.password_save')}
                        </button>
                        <button type="button" onClick={() => { reset(); setOpen(false); }} disabled={busy} className={`${btn.ghost('sm')} cursor-pointer`}>
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={sendResetLink}
                            disabled={busy || !email}
                            className="ml-auto text-[13px] font-medium text-stone-600 hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {t('profile.password_forgot')}
                        </button>
                    </div>
                </form>
            )}

            {notice && (
                <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-center gap-1.5 text-[13px] font-medium ${notice.tone === 'error' ? 'text-red-700' : 'text-stone-700'}`}>
                    {notice.tone === 'ok' && <Check size={14} className="stroke-[3px] text-[#3f6b3a]" />}
                    {notice.text}
                </p>
            )}
        </div>
    );
}
