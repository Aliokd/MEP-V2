"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, useAnimationControls } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signInWithRedirect, getRedirectResult, getAdditionalUserInfo, signOut, type UserCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { createUserProfile } from '@/lib/userProfile';
import { recordTermsAcceptance } from '@/lib/termsAcceptance';
import { clearOpenProject } from '@/lib/storage';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import { SIGNUPS_OPEN, waitlistJoinPath } from '@/lib/uiFlags';
import { hasValidInvitePass, forgetInvitePass } from '@/lib/invitePass';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SignInPage() {
    return <SignInPageInner />;
}

function SignInPageInner() {
    const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    // A missing field is asked for by shaking it, not by writing a sentence
    // about it. Same gesture as the onboarding quiz and email step.
    //
    // Driven through animation controls rather than a CSS class so it replays
    // on the second and third press — re-adding a class an element never lost
    // is not a change the engine replays — and so the field keeps its focus
    // and caret, which remounting to force a replay would throw away.
    const emailShake = useAnimationControls();
    const passwordShake = useAnimationControls();
    const shake = (controls: ReturnType<typeof useAnimationControls>) =>
        controls.start({ x: [0, -6, 5, -4, 3, -2, 0], transition: { duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] } });
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const { language, t } = useLanguage();

    // Invite emails link here with ?email= so the recipient only has to copy the
    // password. Read from window rather than useSearchParams: this page has no
    // Suspense boundary, and a prefill is not worth adding one for.
    useEffect(() => {
        const prefilled = new URLSearchParams(window.location.search).get('email');
        if (prefilled) setEmail((current) => current || prefilled);
    }, []);

    const handleAuthError = (err: any) => {
        console.error('Google Sign-In error details:', err);
        if (err.code === 'auth/user-disabled') {
            setError(t('signin.errors.account_blocked'));
        } else if (err.code === 'auth/operation-not-allowed') {
            setError(t('auth_errors.google_not_enabled'));
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(t('auth_errors.unauthorized_domain'));
        } else if (err.code === 'auth/popup-blocked') {
            setError(t('auth_errors.popup_blocked'));
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError(t('auth_errors.popup_closed'));
        } else {
            setError(t('auth_errors.google_failed'));
        }
    };

    /**
     * What happens after Google hands back a credential — shared by the popup
     * and the redirect fallback, because a gate on only one of them is no gate.
     *
     * Google has no sign-up/sign-in distinction: by the time this runs, Firebase
     * has already created the account. So an account with no profile document is
     * a *signup*, and while signups are closed it has to be undone rather than
     * refused in advance. Signing in an account that already has a profile is
     * untouched — the wall is around new accounts, not existing songwriters.
     */
    const completeGoogleSignIn = async (result: UserCredential) => {
        const user = result.user;
        const profile = await getDoc(doc(db, "users", user.uid));

        // An invitee who chose "Continue with Google" here rather than in the
        // onboarding flow. The invite is re-checked with the server, never
        // trusted from storage — see lib/invitePass.
        const invited = !profile.exists() && !SIGNUPS_OPEN ? await hasValidInvitePass() : false;
        if (invited) forgetInvitePass();

        if (!profile.exists() && !SIGNUPS_OPEN && !invited) {
            // Only delete what this sign-in just created. An older account that
            // has somehow lost its profile document is a repair job, not a
            // trespasser, and deleting its auth record would take its identity
            // with it — so that case is signed out and left alone.
            const isNewAccount = getAdditionalUserInfo(result)?.isNewUser === true;
            try {
                if (isNewAccount) await user.delete();
                else await signOut(auth);
            } catch {
                await signOut(auth).catch(() => {});
            }
            // `from` is recorded on the waiting-list entry, so the console can
            // see how many people arrive by trying to sign in with Google.
            router.push('/waiting-list?from=google-signin');
            return;
        }

        if (!profile.exists()) {
            // Writes the terms-acceptance fields itself — signup happens behind
            // the legal notice this page shows next to every way in.
            await createUserProfile(user, { locale: language });
        } else {
            // Existing accounts: re-record acceptance if it is missing (accounts
            // that predate the field, admin-created accounts) or the version has
            // bumped. Best-effort — must never block a sign-in.
            void recordTermsAcceptance(user.uid);
        }
        clearOpenProject(user.uid);
        router.push('/platform/create');
    };

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    setIsLoading(true);
                    await completeGoogleSignIn(result);
                }
            } catch (err: any) {
                console.error('Redirect sign-in error:', err);
                handleAuthError(err);
            } finally {
                setIsLoading(false);
            }
        };
        checkRedirectResult();
        // completeGoogleSignIn is stable enough for this one-shot check: it only
        // closes over the router and the language, both of which are in the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, language]);

    const handlePasswordSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            // Nothing to explain: the empty box is the message.
            if (!email) shake(emailShake);
            if (!password) shake(passwordShake);
            return;
        }

        setIsLoading(true);
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            // Continuing past the legal notice next to the button is the
            // acceptance being recorded. Best-effort — never blocks sign-in.
            void recordTermsAcceptance(credential.user.uid);
            // Signing in starts a session; it should open the workspace, not drop
            // straight back into whatever song was last open. See clearOpenProject —
            // a refresh deliberately still restores it.
            clearOpenProject(credential.user.uid);
            router.push('/platform/create');
        } catch (err: any) {
            console.error('Password sign-in error:', err);
            if (err.code === 'auth/user-disabled') {
                // Blocked, not mistyped — "invalid email or password" would send
                // them round the reset-password loop forever.
                setError(t('signin.errors.account_blocked'));
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError(t('signin.errors.invalid_credentials'));
                shake(emailShake);
                shake(passwordShake);
            } else {
                setError(t('signin.errors.signin_failed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendResetEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) {
            shake(emailShake);
            return;
        }

        setIsLoading(true);
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/reset-password`,
                handleCodeInApp: true,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setView('sent');
        } catch (err: any) {
            console.error('Password reset email error:', err);
            setError(t('signin.errors.reset_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        try {
            await completeGoogleSignIn(await signInWithPopup(auth, googleProvider));
        } catch (err: any) {
            console.error('Google Sign-In error:', err);
            if (
                err.code === 'auth/popup-blocked' ||
                err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request'
            ) {
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirectErr: any) {
                    handleAuthError(redirectErr);
                }
            } else {
                handleAuthError(err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-16 sm:py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
            <div className="absolute top-8 right-6 md:top-12 md:right-10 z-50">
                <LanguageSwitcher variant="marketing" direction="down" iconOnly tooltipSide="bottom" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-2 flex flex-col items-center">
                    <h2 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">{t('signin.title')}</h2>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">{t('signin.subtitle')}</p>
                </div>

                {/* No card on a phone. The frame is a desktop device for gathering the
                    form out of a wide empty page; on a phone the form already fills the
                    screen, so all it added was a second border a few pixels outside each
                    input's own — and a tinted ground that flattened the white fields
                    sitting on it. The form sits straight on the page instead. */}
                <div className="bg-transparent border-0 p-0 rounded-none shadow-none backdrop-blur-none sm:bg-white/60 sm:border sm:border-stone-200/80 sm:p-10 sm:rounded-[20px] sm:shadow-sm sm:backdrop-blur-md">
                    {view === 'login' && (
                        <form onSubmit={handlePasswordSignIn} noValidate className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-[#3f6b3a]">
                                    <span>{error}</span>
                                </div>
                            )}
                            <div className="space-y-4 text-left">
                                <motion.div animate={emailShake}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('signin.email_placeholder')}
                                    className="w-full h-16 md:h-[72px] bg-white border border-stone-200 rounded-full px-6 md:px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                    disabled={isLoading}
                                />
                                </motion.div>
                                <div className="space-y-2">
                                    <motion.div animate={passwordShake} className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t('signin.password_placeholder')}
                                            className="w-full h-16 md:h-[72px] bg-white border border-stone-200 rounded-full pl-6 pr-14 md:pl-8 md:pr-14 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} className="w-5 h-5" /> : <Eye size={20} className="w-5 h-5" />}
                                        </button>
                                    </motion.div>
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setView('forgot');
                                                setError('');
                                            }}
                                            className="text-xs md:text-sm text-stone-500 hover:text-stone-900 transition-colors font-semibold underline underline-offset-4"
                                            disabled={isLoading}
                                        >
                                            {t('signin.forgot_password')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`btn-press w-full h-16 md:h-[72px] flex items-center justify-center gap-3 text-base md:text-xl font-semibold ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? t('signin.signing_in') : t('signin.sign_in')}
                                {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                            </button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleSendResetEmail} className="space-y-6">
                            <div className="text-center space-y-2 flex flex-col items-center">
                                <h3 className="text-2xl font-sans font-light tracking-tight text-stone-900">{t('signin.reset_title')}</h3>
                                <p className="text-stone-600 text-sm font-medium">{t('signin.reset_desc')}</p>
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-[#3f6b3a]">
                                    <span>{error}</span>
                                </div>
                            )}
                             <div className="space-y-4 text-left">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('signin.email_placeholder')}
                                    className="w-full h-16 md:h-[72px] bg-white border border-stone-200 rounded-full px-6 md:px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-stone-500 text-center">
                                    {t('signin.reset_spam_note')}
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`btn-press w-full h-16 md:h-[72px] flex items-center justify-center gap-3 text-base md:text-xl font-semibold ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? t('signin.sending_link') : t('signin.send_reset_link')}
                                {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                            </button>
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('login');
                                        setError('');
                                    }}
                                    className="text-sm text-stone-600 hover:text-stone-900 transition-colors font-medium underline underline-offset-4"
                                    disabled={isLoading}
                                >
                                    {t('signin.back_to_signin')}
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'sent' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-4 flex flex-col items-center">
                                <h2 className="text-2xl font-sans font-light tracking-tight text-stone-900">{t('signin.check_email')}</h2>
                                <p className="text-stone-700/80 text-sm font-medium max-w-sm mx-auto">
                                    {t('signin.sent_desc_prefix')} <span className="font-semibold text-stone-900">{email}</span>{t('signin.sent_desc_suffix')}
                                </p>
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs px-4 py-3 rounded-xl flex items-start gap-2 max-w-sm mx-auto text-left">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        {t('signin.sent_spam_prefix')} <strong>{t('signin.sent_spam_spam')}</strong> {t('signin.sent_spam_or')} <strong>{t('signin.sent_spam_junk')}</strong>{t('signin.sent_spam_suffix')}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setView('login');
                                    setError('');
                                }}
                                className="w-full h-16 md:h-[72px] border border-stone-300 hover:bg-stone-50/50 text-stone-850 text-base md:text-lg font-semibold rounded-full transition-all active:scale-[0.99]"
                            >
                                {t('signin.back_to_signin')}
                            </button>
                        </div>
                    )}

                    {view === 'login' && (
                        <>
                            <div className="mt-6 flex items-center gap-4">
                                <div className="h-px bg-stone-200/80 flex-grow" />
                                <span className="text-xs text-stone-500 font-medium">{t('signin.or')}</span>
                                <div className="h-px bg-stone-200/80 flex-grow" />
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="mt-4 md:mt-6 w-full h-16 md:h-[72px] flex items-center justify-center gap-3 border border-stone-200 rounded-full text-base md:text-xl font-semibold text-stone-900 bg-white hover:bg-stone-50 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {t('signin.google')}
                            </button>

                            {/* The acceptance the account records at signup and
                                sign-in points back to this line — it must sit
                                beside every way in, and removing it breaks the
                                legal basis of that record. See lib/termsAcceptance. */}
                            <p className="mt-5 text-xs text-stone-500 text-center leading-relaxed">
                                {t('signin.agree_prefix')}
                                <Link href={localizePath('/terms', language)} className="underline underline-offset-2 hover:text-stone-700">{t('signin.agree_terms')}</Link>
                                {t('signin.agree_middle')}
                                <Link href={localizePath('/privacy', language)} className="underline underline-offset-2 hover:text-stone-700">{t('signin.agree_privacy')}</Link>
                                {t('signin.agree_suffix')}
                            </p>
                        </>
                    )}

                    <div className="mt-8 pt-8 border-t border-stone-200/80 text-center">
                        <p className="text-sm text-stone-600 font-sans font-medium">
                            {t('signin.new_to_veinote')}{' '}
                            <Link href={waitlistJoinPath('signin', language)} className="text-stone-900 transition-colors underline-offset-4 hover:underline font-bold">{t('home.nav.waitlist')}</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
