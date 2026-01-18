"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/platform');
        } catch (err: any) {
            console.error('SignIn error:', err);
            setError(err.message || 'Failed to sign in. Please check your credentials.');
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
            router.push('/platform');
        } catch (err: any) {
            console.error('Google Sign-In error:', err);
            setError(err.message || 'Failed to sign in with Google.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-white dark:bg-[#050505] relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gold-500/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gold-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-12 space-y-4">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-serif text-gold-500 tracking-tighter">THE CONSERVATORY</h1>
                    </Link>
                    <h2 className="text-4xl font-serif text-stone-900 dark:text-alabaster transition-colors duration-300">Welcome Back</h2>
                    <p className="text-stone-900/50 dark:text-alabaster/50 font-sans font-light transition-colors duration-300">Continue your descent into mastery.</p>
                </div>

                <div className="bg-stone-50 dark:bg-charcoal border border-stone-200 dark:border-white/5 p-10 rounded-xs shadow-2xl transition-colors duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-500/10 border border-red-500/20 rounded-xs p-4 flex items-center gap-3 text-red-500 text-sm"
                            >
                                <AlertCircle size={18} />
                                {error}
                            </motion.div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold-500" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-4 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="maestro@conservatory.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold transition-colors duration-300">Password</label>
                                <a href="#" className="text-[10px] uppercase tracking-widest text-gold-500 hover:text-gold-500/80 transition-colors">Forgot?</a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold-500" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-4 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center gap-3 py-5 text-sm tracking-[0.2em] uppercase font-bold bg-stone-900 dark:bg-alabaster text-white dark:text-charcoal hover:bg-gold-500 dark:hover:bg-gold-500 dark:hover:text-white transition-all rounded-xs ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'ESTABLISHING CONNECTION...' : 'RESUME PRACTICE'}
                            {!isLoading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center gap-4">
                        <div className="h-px bg-stone-200 dark:bg-white/5 flex-grow" />
                        <span className="text-[10px] uppercase tracking-widest text-stone-900/40 dark:text-alabaster/40 font-bold">or</span>
                        <div className="h-px bg-stone-200 dark:bg-white/5 flex-grow" />
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="mt-6 w-full flex items-center justify-center gap-3 py-4 border border-stone-200 dark:border-white/10 rounded-xs text-[10px] tracking-widest uppercase font-bold text-stone-900 dark:text-alabaster hover:bg-stone-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="mt-8 pt-8 border-t border-stone-100 dark:border-white/5 text-center transition-colors duration-300">
                        <p className="text-[10px] text-stone-900/40 dark:text-alabaster/40 font-sans transition-colors duration-300 uppercase tracking-widest">
                            New to the platform?{' '}
                            <Link href="/signup" className="text-gold-500 hover:text-gold-500/80 transition-colors underline-offset-4 hover:underline">Begin your audition</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
