"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

export default function SignInPage() {
    const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();

    const handleAuthError = (err: any) => {
        console.error('Google Sign-In error details:', err);
        if (err.code === 'auth/operation-not-allowed') {
            setError('Google Sign-In is not enabled. Please enable Google as a sign-in provider in your Firebase Console under Authentication > Sign-in method.');
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the Authorized Domains list in your Firebase Console.`);
        } else if (err.code === 'auth/popup-blocked') {
            setError('Sign-in popup was blocked by your browser. Please allow popups for this site, or try again.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError('Sign-in popup was closed before completing. Please try again.');
        } else {
            setError(err.message || 'Failed to sign in with Google.');
        }
    };

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    setIsLoading(true);
                    const user = result.user;
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (!userDoc.exists()) {
                        await setDoc(doc(db, "users", user.uid), {
                            uid: user.uid,
                            name: user.displayName,
                            email: user.email,
                            createdAt: new Date().toISOString(),
                            tier: 'performer'
                        });
                    }
                    router.push('/platform/create');
                }
            } catch (err: any) {
                console.error('Redirect sign-in error:', err);
                handleAuthError(err);
            } finally {
                setIsLoading(false);
            }
        };
        checkRedirectResult();
    }, [router]);

    const handlePasswordSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/platform/create');
        } catch (err: any) {
            console.error('Password sign-in error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Failed to sign in. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendResetEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) {
            setError('Please enter your email address.');
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
            setError(err.message || 'Failed to send password reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    tier: 'performer'
                });
            }
            router.push('/platform/create');
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
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-2 flex flex-col items-center">
                    <h2 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">Ready to write?</h2>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">Sign in to continue your songwriting journey.</p>
                </div>

                <div className="bg-white/60 border border-stone-200/80 p-6 sm:p-10 rounded-[20px] shadow-sm backdrop-blur-md">
                    {view === 'login' && (
                        <form onSubmit={handlePasswordSignIn} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <div className="space-y-4 text-left">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 px-5 md:py-5 md:px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                    disabled={isLoading}
                                />
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Password"
                                            className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 pl-5 pr-12 md:py-5 md:pl-8 md:pr-14 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} className="w-5 h-5" /> : <Eye size={20} className="w-5 h-5" />}
                                        </button>
                                    </div>
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
                                            Forgot password?
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-3 py-3.5 md:py-5 text-base md:text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Signing In...' : 'Sign In'}
                                {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                            </button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleSendResetEmail} className="space-y-6">
                            <div className="text-center space-y-2 flex flex-col items-center">
                                <h3 className="text-2xl font-sans font-light tracking-tight text-stone-900">Reset your password</h3>
                                <p className="text-stone-600 text-sm font-medium">Enter your email and we'll send you a recovery link.</p>
                            </div>
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                             <div className="space-y-4 text-left">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 px-5 md:py-5 md:px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-stone-500 text-center">
                                    Note: Please check your spam folder if the recovery link doesn't arrive.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-3 py-3.5 md:py-5 text-base md:text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Sending link...' : 'Send Reset Link'}
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
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'sent' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-4 flex flex-col items-center">
                                <h2 className="text-2xl font-sans font-light tracking-tight text-stone-900">Check your email</h2>
                                <p className="text-stone-700/80 text-sm font-medium max-w-sm mx-auto">
                                    We sent a password reset link to <span className="font-semibold text-stone-900">{email}</span>. Click the link in your email to reset your password.
                                </p>
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs px-4 py-3 rounded-xl flex items-start gap-2 max-w-sm mx-auto text-left">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        If you don't see the email within a couple of minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setView('login');
                                    setError('');
                                }}
                                className="w-full py-3.5 md:py-5 border border-stone-300 hover:bg-stone-50/50 text-stone-850 text-base md:text-lg font-semibold rounded-[20px] transition-all"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    )}

                    {view === 'login' && (
                        <>
                            <div className="mt-6 flex items-center gap-4">
                                <div className="h-px bg-stone-200/80 flex-grow" />
                                <span className="text-xs text-stone-500 font-medium">or</span>
                                <div className="h-px bg-stone-200/80 flex-grow" />
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="mt-4 md:mt-6 w-full flex items-center justify-center gap-3 py-3.5 md:py-5 border border-stone-200 rounded-[20px] text-base md:text-xl font-semibold text-stone-900 bg-white hover:bg-stone-50 shadow-sm transition-all disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}

                    <div className="mt-8 pt-8 border-t border-stone-200/80 text-center">
                        <p className="text-sm text-stone-600 font-sans font-medium">
                            New to Veinote?{' '}
                            <Link href="/onboarding" className="text-stone-900 transition-colors underline-offset-4 hover:underline font-bold">Join now</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
