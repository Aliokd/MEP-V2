"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Logo from '@/components/Logo';

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        tier: 'performer'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: formData.name
            });

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: formData.name,
                email: formData.email,
                createdAt: new Date().toISOString(),
                tier: formData.tier
            });

            router.push('/platform');
        } catch (err: any) {
            console.error('SignUp error:', err);
            setError(err.message || 'Failed to create account.');
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
                    <p className="text-stone-600 font-sans font-light text-base md:text-lg">Create your account to begin your songwriting journey.</p>
                </div>

                <div className="bg-white/60 border border-stone-200/80 p-8 md:p-12 rounded-[20px] shadow-sm backdrop-blur-md grid md:grid-cols-2 gap-12">
                    <div className="space-y-8 text-left">
                        <div className="space-y-4">
                            <h3 className="text-xl font-sans font-bold text-stone-900">What You Get</h3>
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

                    <form onSubmit={handleSubmit} className="space-y-5 text-left">
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
                        <div className="space-y-1">
                            <label className="text-xs text-stone-600 font-medium ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-stone-900 transition-colors" size={16} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white border border-stone-200 rounded-[12px] py-3 pl-12 pr-4 text-stone-900 font-sans text-sm focus:outline-none focus:border-stone-800 transition-all font-medium placeholder:text-stone-400"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-stone-600 font-medium ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-stone-900 transition-colors" size={16} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white border border-stone-200 rounded-[12px] py-3 pl-12 pr-4 text-stone-900 font-sans text-sm focus:outline-none focus:border-stone-800 transition-all font-medium placeholder:text-stone-400"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-stone-600 font-medium ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-stone-900 transition-colors" size={16} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white border border-stone-200 rounded-[12px] py-3 pl-12 pr-4 text-stone-900 font-sans text-sm focus:outline-none focus:border-stone-800 transition-all font-medium placeholder:text-stone-400"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-3 py-4 text-sm font-medium bg-stone-900 text-[#DCDDD4] hover:bg-stone-850 transition-all rounded-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Creating account...' : 'Create Account'}
                                {!isLoading && <ArrowRight size={16} />}
                            </button>
                        </div>

                        <p className="text-sm text-center text-stone-600 font-sans font-medium pt-2">
                            Already a member?{' '}
                            <Link href="/signin" className="text-stone-900 transition-colors underline-offset-4 hover:underline">Sign In</Link>
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
