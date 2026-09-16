"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { User, Mail, BadgeCheck, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import VerifiedMark from '../../components/VerifiedMark';
import VerifyModal from '../components/VerifyModal';
import { useVerificationRequest, useIsVerified } from '@/lib/verification';
import { useLyricSize, LYRIC_SIZES, type LyricSize } from '@/lib/lyricSize';
import { splitName, joinName } from '@/lib/personName';
import { writePublicProfile } from '@/lib/publicProfile';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { authedFetch } from '@/lib/authedFetch';
import { useUserPlan } from '@/lib/useUserPlan';
import { TRIAL_DAYS } from '@/lib/paddle/config';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * The subscription row, in one sentence.
 *
 * What the account is on and what happens to it next, from the fields the
 * Paddle webhook writes: the trial's end, the next charge, a cancellation
 * already scheduled. A cancelled subscription stays `active` until its period
 * runs out, which is why the scheduled change is read before the status.
 */
function describeBilling(
    plan: ReturnType<typeof useUserPlan>,
    t: (key: string) => string,
    locale: string,
): string {
    const date = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : '';
    const { subscriptionStatus: status, billing } = plan;

    if (!plan.paid) {
        if (plan.hasPro || plan.hasMax) return t('profile.billing.granted');
        if (status === 'past_due') return t('profile.billing.past_due');
        if (status === 'paused') return t('profile.billing.paused');
        if (status === 'canceled') return t('profile.billing.canceled');
        return t('profile.billing.no_plan_desc').replace('{days}', String(TRIAL_DAYS));
    }
    if (billing.scheduledChange?.action === 'cancel') {
        return t('profile.billing.cancels').replace('{date}', date(billing.scheduledChange.effectiveAt));
    }
    if (status === 'past_due') return t('profile.billing.past_due');
    if (status === 'trialing') return t('profile.billing.trialing').replace('{date}', date(billing.trialEndsAt ?? billing.nextBilledAt));
    if (billing.nextBilledAt) return t('profile.billing.active_renews').replace('{date}', date(billing.nextBilledAt));
    if (billing.billingPeriod) return t('profile.billing.active_period').replace('{period}', t(`profile.billing.${billing.billingPeriod}`));
    return t('profile.manage_subscription_desc');
}

/**
 * Settings. Lives under /platform/profile so the layout gives it the same
 * focused treatment as the profile itself: no sidebar, back button top-left,
 * slide transitions.
 *
 * Everything adjustable lives here — the account's own details, verification,
 * display size, subscription and language. The profile page keeps what is
 * *about you*: your photo, name, songs and connections.
 */
export default function SettingsPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const plan = useUserPlan();
    const [openingPortal, setOpeningPortal] = useState(false);

    // `name` is the one stored value (Auth displayName); the two fields below
    // are how it is edited, and recompose it on every keystroke.
    const [name, setName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [emailState, setEmailState] = useState<'idle' | 'pending' | 'success'>('idle');
    const [notification, setNotification] = useState('');
    // Set once the client has a window — reading localStorage during render would
    // not match the server pass.
    const [isMockUser, setIsMockUser] = useState(false);
    const [showVerify, setShowVerify] = useState(false);

    const [lyricSize, setLyricSize] = useLyricSize();
    const { request: verification } = useVerificationRequest(user?.uid ?? null);
    const publicVerified = useIsVerified(user?.uid ?? null);
    const isVerified = publicVerified || verification?.status === 'approved';

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            const parts = splitName(user.displayName || '');
            setFirstName(parts.first);
            setLastName(parts.last);
            setEmail(user.email || '');
            setIsMockUser(!!localStorage.getItem('playwright_mock_user'));
        }
    }, [user]);

    if (!user) return null;

    const hasNameChanged = name !== (user.displayName || '');
    const hasEmailChanged = email !== (user.email || '');
    const hasChanges = hasNameChanged || hasEmailChanged;

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 4000);
    };

    /**
     * Paddle's customer portal, where the card, the plan and the invoices
     * live. The server mints a short-lived URL for this account's customer
     * id (/api/paddle/portal); nothing about the customer reaches the
     * browser but the page it may open. Opened in a new tab: it is Paddle's
     * page, and Settings should still be here when it is closed.
     */
    const openBillingPortal = async () => {
        if (openingPortal) return;
        setOpeningPortal(true);
        try {
            const res = await authedFetch('/api/paddle/portal', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) {
                showNotification(t('profile.billing.portal_error'));
                return;
            }
            window.open(data.url, '_blank', 'noopener');
        } catch {
            showNotification(t('profile.billing.portal_error'));
        } finally {
            setOpeningPortal(false);
        }
    };

    const sizeLabel: Record<LyricSize, string> = {
        small: t('profile.size_small'),
        medium: t('profile.size_medium'),
        large: t('profile.size_large'),
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (hasNameChanged) {
            const ok = await updateDisplayName(name);
            if (ok && !hasEmailChanged) showNotification(t('profile.name_updated'));
        }
        if (hasEmailChanged) await requestEmailChange(email);
    };

    /** Returns whether the write landed, so the caller can decide what to say. */
    const updateDisplayName = async (newDisplayName: string): Promise<boolean> => {
        try {
            if (isMockUser) {
                const mockUser = JSON.parse(localStorage.getItem('playwright_mock_user') || '{}');
                mockUser.displayName = newDisplayName;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
                return true;
            }

            const { updateProfile } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newDisplayName });
                // Keep the name other people see in step with the one this user
                // just set — the collaborator list and Connect roster read the
                // public profile, not the Auth record.
                void writePublicProfile(auth.currentUser.uid, { name: newDisplayName });
            }
            return true;
        } catch (error) {
            console.error("Error updating display name:", error);
            showNotification(t('profile.name_update_failed'));
            return false;
        }
    };

    /*
     * A real email change: Firebase sends a confirmation link to the NEW address
     * and only switches the account once it is opened — which is what the
     * "pending" state below describes.
     */
    const requestEmailChange = async (newEmail: string) => {
        setPendingEmail(newEmail);
        if (isMockUser) {
            setEmailState('pending');
            return;
        }
        try {
            const { verifyBeforeUpdateEmail } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            if (!auth.currentUser) return;
            await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
            setEmailState('pending');
        } catch (error: any) {
            console.error("Error requesting email change:", error);
            setEmail(user?.email || '');
            showNotification(
                error?.code === 'auth/requires-recent-login'
                    ? t('profile.email_requires_recent_login')
                    : t('profile.error_update_email')
            );
        }
    };

    /** Mock accounts only: stands in for opening the confirmation link. */
    const handleCompleteVerification = async () => {
        try {
            const mockUser = JSON.parse(localStorage.getItem('playwright_mock_user') || '{}');
            mockUser.email = pendingEmail;
            safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
            setEmailState('success');
            setEmail(pendingEmail);
            setTimeout(() => {
                setEmailState('idle');
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Error updating email:", error);
            showNotification(t('profile.error_update_email'));
        }
    };

    return (
        <div className="space-y-8 px-5 md:px-0 text-stone-900 font-sans">
            <header>
                <h1 className="text-3xl font-sans font-light tracking-tight text-stone-900">
                    {t('profile.settings_title')}
                </h1>
            </header>

            {/* Account — the name and address the rest of the platform reads. */}
            {emailState === 'idle' && (
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[13px] text-stone-600 font-medium">{t('profile.first_name')}</label>
                            <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                <User size={15} className="text-stone-400" />
                                <input
                                    type="text"
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(e) => { setFirstName(e.target.value); setName(joinName(e.target.value, lastName)); }}
                                    placeholder={t('profile.placeholder_first_name')}
                                    className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] text-stone-600 font-medium">{t('profile.last_name')}</label>
                            <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                <input
                                    type="text"
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(e) => { setLastName(e.target.value); setName(joinName(firstName, e.target.value)); }}
                                    placeholder={t('profile.placeholder_last_name')}
                                    className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] text-stone-600 font-medium">{t('profile.email')}</label>
                            <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                <Mail size={15} className="text-stone-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                    {hasChanges && (
                        <div className="pt-1">
                            <button type="submit" className={`${btn.primary('sm')} cursor-pointer`}>
                                {t('profile.save_details')}
                            </button>
                        </div>
                    )}
                    {notification && (
                        <p className="text-[13px] text-stone-600 font-medium animate-in fade-in duration-200">{notification}</p>
                    )}
                </form>
            )}

            {emailState === 'pending' && (
                <div className="space-y-4 py-2 border-l-2 border-stone-300 pl-4 animate-in fade-in duration-200">
                    <p className="text-sm font-semibold text-stone-800">{t('profile.verify_title')}</p>
                    <p className="text-[13px] text-stone-600 leading-relaxed">
                        {t('profile.email_link_sent')} <span className="font-semibold text-stone-800">{pendingEmail}</span>{t('profile.email_link_sent_end')}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        {isMockUser && (
                            <button onClick={handleCompleteVerification} className={`${btn.secondary('xs')} cursor-pointer`}>
                                {t('profile.simulate_click')}
                            </button>
                        )}
                        <button
                            onClick={() => { setEmailState('idle'); setEmail(user.email || ''); }}
                            className={`${btn.ghost('xs')} cursor-pointer`}
                        >
                            {t('profile.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {emailState === 'success' && (
                <div className="py-2 border-l-2 border-[#86BE7F] pl-4">
                    <p className="text-sm font-semibold text-[#3f6b3a]">{t('profile.success_title')}</p>
                    <p className="text-[13px] text-stone-600 mt-1">{t('profile.success_desc')} {email}{t('profile.returning_platform')}</p>
                </div>
            )}

            <div className="h-px bg-stone-200/60" />

            {/* Display — the only setting that changes something you can see, so it
                shows it: the preview is drawn with the same class the canvas uses,
                and re-sizes as you choose. */}
            <section className="space-y-3">
                <div className="space-y-0.5">
                    <p className="font-sans text-sm font-medium text-stone-800">{t('profile.display_title')}</p>
                    <p className="text-[13px] text-stone-600">{t('profile.display_desc')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {LYRIC_SIZES.map((size) => {
                        const selected = size === lyricSize;
                        return (
                            <button
                                key={size}
                                onClick={() => setLyricSize(size)}
                                aria-pressed={selected}
                                className={
                                    selected
                                        ? `${btn.secondary('sm')} !border-stone-800 !bg-white !text-stone-900 cursor-pointer`
                                        : `${btn.secondary('sm')} cursor-pointer`
                                }
                            >
                                {sizeLabel[size]}
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-[20px] bg-white/60 border border-stone-200/70 px-5 py-6 overflow-hidden">
                    <p className="lyric-type font-lyrics font-medium text-stone-600 leading-[1.4] tracking-[-0.035em] text-center">
                        {t('profile.display_preview')}
                    </p>
                </div>
            </section>

            <div className="h-px bg-stone-200/60" />

            <div className="space-y-1">
                {/* Get verified — the seal beside your name. Three requirements
                    (real name, biography, photo); an admin makes the call, so the
                    row reads the live request state rather than a local flag. */}
                <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                    <div className="space-y-0.5">
                        <p className="font-sans text-sm font-medium text-stone-800 flex items-center gap-2">
                            {t('profile.get_verified_title')}
                            {isVerified && <VerifiedMark size={15} label={t('profile.verified_label')} />}
                        </p>
                        <p className="text-[13px] text-stone-600">
                            {isVerified
                                ? t('profile.verify_approved')
                                : verification?.status === 'pending'
                                ? t('profile.verify_pending_desc')
                                : verification?.status === 'declined'
                                ? (verification.note || t('profile.verify_declined'))
                                : t('profile.get_verified_desc')}
                        </p>
                    </div>
                    {!isVerified && (
                        verification?.status === 'pending' ? (
                            <span className="ml-4 shrink-0 whitespace-nowrap rounded-full bg-stone-200/70 px-3.5 py-1.5 text-[12px] font-semibold text-stone-600">
                                {t('profile.verify_pending')}
                            </span>
                        ) : (
                            <button
                                onClick={() => setShowVerify(true)}
                                aria-haspopup="dialog"
                                className={`${btn.secondary('sm')} ml-4 shrink-0 whitespace-nowrap cursor-pointer`}
                            >
                                <BadgeCheck size={14} />
                                {verification?.status === 'declined' ? t('profile.verify_try_again') : t('profile.get_verified_action')}
                            </button>
                        )
                    )}
                </div>

                {/* The plan, and the one control that acts on it. A paying
                    account gets Paddle's portal (card, cancel, invoices); an
                    account with nothing to manage gets the plans. Pro and Max
                    are brand names and stay untranslated. */}
                <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                    <div className="space-y-0.5">
                        <p className="font-sans text-sm font-medium text-stone-800">
                            {t('profile.current_plan')}{': '}
                            <span className="font-semibold">
                                {plan.loading ? '' : plan.hasMax ? 'Max' : plan.hasPro ? 'Pro' : t('profile.billing.no_plan')}
                            </span>
                        </p>
                        <p className="text-[13px] text-stone-600">
                            {plan.loading ? '' : describeBilling(plan, t, language)}
                        </p>
                    </div>
                    {!plan.loading && (plan.billing.hasSubscription ? (
                        <button
                            type="button"
                            onClick={openBillingPortal}
                            disabled={openingPortal}
                            className={`${btn.secondary('sm')} ml-4 shrink-0 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed`}
                        >
                            {openingPortal ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            {openingPortal ? t('profile.billing.opening') : t('profile.manage_action')}
                        </button>
                    ) : !plan.hasPro && (
                        <Link
                            href="/onboarding?step=paywall"
                            className={`${btn.secondary('sm')} ml-4 shrink-0 whitespace-nowrap cursor-pointer`}
                        >
                            <CreditCard size={14} />
                            {t('profile.billing.choose_plan')}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <p className="font-sans text-sm font-medium text-stone-800">{t('profile.language_title')}</p>
                        <p className="text-[13px] text-stone-600">{t('profile.language_desc')}</p>
                    </div>
                    <div className="ml-4 shrink-0">
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            <VerifyModal
                isOpen={showVerify}
                onClose={() => setShowVerify(false)}
                uid={user.uid}
                name={name}
                photoURL={user.photoURL || ''}
                initialBio={verification?.bio}
                t={t}
            />
        </div>
    );
}
