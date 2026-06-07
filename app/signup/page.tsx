"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SignUpPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailShowError, setEmailShowError] = useState(false);
    const tier = 'performer';
    
    const router = useRouter();

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
            
            router.push('/platform');
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

                <div className="bg-white/60 border border-stone-200/80 p-8 md:p-12 rounded-[20px] shadow-sm backdrop-blur-md grid md:grid-cols-2 gap-12">
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
                                    className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans focus:outline-none focus:border-stone-800 transition-all text-xl font-medium placeholder:text-stone-500 placeholder:text-xl"
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
                                                className={`w-full border rounded-[20px] py-5 pl-8 pr-12 text-stone-900 font-sans outline-none transition-all text-xl font-medium placeholder:text-stone-500 placeholder:text-xl ${
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
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans focus:outline-none focus:border-stone-800 transition-all text-xl font-medium placeholder:text-stone-500 placeholder:text-xl"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex items-center justify-center gap-3 py-5 text-xl font-semibold bg-[#86BE7F] hover:opacity-95 text-stone-900 transition-all rounded-[20px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Creating account...' : 'Create Account'}
                                    {!isLoading && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                                </button>
                            </div>
                        </form>

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
