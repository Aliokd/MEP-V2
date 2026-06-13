"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

export default function SignUpPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailShowError, setEmailShowError] = useState(false);
    const tier = 'performer';
    
    const router = useRouter();

    const handleAuthError = (err: any) => {
        console.error('Google Sign-Up error details:', err);
        if (err.code === 'auth/operation-not-allowed') {
            setError('Google Sign-In is not enabled. Please enable Google as a sign-in provider in your Firebase Console under Authentication > Sign-in method.');
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the Authorized Domains list in your Firebase Console.`);
        } else if (err.code === 'auth/popup-blocked') {
            setError('Sign-up popup was blocked by your browser. Please allow popups for this site, or try again.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError('Sign-up popup was closed before completing. Please try again.');
        } else {
            setError(err.message || 'Failed to sign up with Google.');
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
                            tier: tier
                        });
                    }
                    router.push('/platform/create');
                }
            } catch (err: any) {
                console.error('Redirect sign-up error:', err);
                handleAuthError(err);
            } finally {
                setIsLoading(false);
            }
        };
        checkRedirectResult();
    }, [router]);

    const handleGoogleSignUp = async () => {
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
                    tier: tier
                });
            }
            router.push('/platform/create');
        } catch (err: any) {
            console.error('Google Sign-Up error:', err);
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

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !name || !password) {
            setError('Please enter your name, email, and password.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        
        setIsLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            await updateProfile(user, { displayName: name });
            
            // Write profile to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                tier: tier
            });
            
            router.push('/platform/create');
        } catch (err: any) {
            console.error('Sign-up error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use. Please sign in instead.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
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
                className="w-full max-w-2xl relative z-10"
            >
                <div className="text-center mb-12 space-y-2 flex flex-col items-center">
                    <h2 className="text-5xl md:text-6xl font-sans font-light text-stone-900 tracking-tight">Start writing.</h2>
                    <p className="text-stone-600 font-sans font-normal text-base md:text-lg">Create your account to begin your songwriting journey.</p>
                </div>

                <div className="bg-white/60 border border-stone-200/80 p-6 md:p-12 rounded-[20px] shadow-sm backdrop-blur-md grid md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-8 text-left">
                        <div className="space-y-4">
                            <h3 className="text-xl font-sans font-bold text-stone-900">What you get</h3>
                            <ul className="space-y-4">
                                {[
                                    "Access to songwriting tools",
                                    "Step-by-step music lessons",
                                    "Connect with other musicians",
                                    "Feedback from real artists"
                                ].map((perk, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-stone-900 font-sans font-semibold items-center">
                                        <CheckCircle2 size={16} className="text-stone-900 shrink-0" />
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-6 bg-white/40 border border-stone-200/80 rounded-[12px]">
                            <p className="text-xs text-stone-800 font-sans font-medium leading-relaxed">
                                "Every great song starts with a single line."
                            </p>
                            <p className="text-xs text-stone-600 mt-3 font-medium">— Peter Nordberg</p>
                        </div>
                    </div>

                    <div className="space-y-5 text-left">
                        <form onSubmit={handleSignUp} className="space-y-5 text-left">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-[12px] p-4 flex items-center gap-3 text-red-700 text-xs font-semibold"
                                >
                                    <AlertCircle size={18} className="shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 px-5 md:py-5 md:px-8 text-stone-900 font-sans focus:outline-none focus:border-stone-800 transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {(() => {
                                const isValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                                return (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                                                        setEmailShowError(false);
                                                    }
                                                }}
                                                onFocus={() => setEmailShowError(false)}
                                                onBlur={() => {
                                                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== '') {
                                                        setEmailShowError(true);
                                                    }
                                                }}
                                                placeholder="Email Address"
                                                className={`w-full border rounded-[20px] py-3.5 pl-5 pr-12 md:py-5 md:pl-8 md:pr-12 text-stone-900 font-sans outline-none transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl ${
                                                    email === ''
                                                        ? 'bg-white border-stone-200 focus:border-stone-850'
                                                        : isValid
                                                            ? 'bg-[#EAF7E8] border-[#86BE7F] focus:border-[#86BE7F]'
                                                            : emailShowError
                                                                ? 'bg-[#FFF6F0] border-[#E07A5F] focus:border-[#E07A5F]'
                                                                : 'bg-white border-stone-200 focus:border-stone-850'
                                                }`}
                                                disabled={isLoading}
                                            />
                                            {email !== '' && !isValid && emailShowError && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C94A29]">
                                                    <AlertCircle size={20} className="stroke-[2px]" />
                                                </div>
                                            )}
                                        </div>
                                        {email !== '' && !isValid && emailShowError && (
                                            <p className="text-xs text-[#C94A29] font-medium mt-2 ml-4">
                                                Please enter a valid email address.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-white border border-stone-200 rounded-[20px] py-3.5 pl-5 pr-12 md:py-5 md:pl-8 md:pr-14 text-stone-900 font-sans focus:outline-none focus:border-stone-800 transition-all text-base md:text-xl font-medium placeholder:text-stone-500 placeholder:text-base md:placeholder:text-xl"
                                        required
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
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex items-center justify-center gap-3 py-3.5 md:py-5 text-base md:text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Creating account...' : 'Create Account'}
                                    {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 flex items-center gap-4">
                            <div className="h-px bg-stone-200/80 flex-grow" />
                            <span className="text-xs text-stone-500 font-medium">or</span>
                            <div className="h-px bg-stone-200/80 flex-grow" />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 md:py-5 border border-stone-200 rounded-[20px] text-base md:text-xl font-semibold text-stone-900 bg-white hover:bg-stone-50 shadow-sm transition-all disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Create with Google
                        </button>

                        <p className="text-sm text-center text-stone-600 font-sans font-medium pt-2">
                            Already a member?{' '}
                            <Link href="/signin" className="text-stone-900 transition-colors underline-offset-4 hover:underline">Sign In</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
