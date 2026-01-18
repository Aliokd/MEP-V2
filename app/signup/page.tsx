"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
        <div className="min-h-screen flex items-center justify-center px-6 py-32 bg-white dark:bg-[#050505] relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gold-500/5 blur-[120px] rounded-full" />
                <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gold-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-2xl relative z-10"
            >
                <div className="text-center mb-12 space-y-4">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-serif text-gold-500 tracking-tighter">THE CONSERVATORY</h1>
                    </Link>
                    <h2 className="text-4xl font-serif text-stone-900 dark:text-alabaster transition-colors duration-300">Commence Your Evolution</h2>
                    <p className="text-stone-900/50 dark:text-alabaster/50 font-sans font-light transition-colors duration-300">Join the elite network of modern virtuosos.</p>
                </div>

                <div className="bg-stone-50 dark:bg-charcoal border border-stone-200 dark:border-white/5 p-8 md:p-12 rounded-xs shadow-2xl grid md:grid-cols-2 gap-12 transition-colors duration-300">
                    <div className="space-y-8 text-left">
                        <div className="space-y-4">
                            <h3 className="text-xl font-serif text-gold-500">Membership Perks</h3>
                            <ul className="space-y-4">
                                {[
                                    "Access to the Synesthesia Engine",
                                    "Structured Masterclass Path",
                                    "Global Networking Events",
                                    "Maestro Performance Reviews"
                                ].map((perk, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-stone-900/60 dark:text-alabaster/60 font-sans items-center transition-colors duration-300">
                                        <CheckCircle2 size={16} className="text-gold-500 shrink-0" />
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-black/40 border border-gold-500/20 rounded-xs transition-colors duration-300">
                            <p className="text-xs text-gold-500 italic font-serif leading-relaxed">
                                "The foundation you build today determines the height of your symphony tomorrow."
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 mt-3 font-bold transition-colors duration-300">— THE MAESTRO</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 text-left">
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
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold-500" size={16} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="Wolfgang Mozart"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold-500" size={16} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="wolf@salzburg.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 font-bold ml-1 transition-colors duration-300">Create Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-stone-900/20 dark:text-alabaster/20 group-focus-within:text-gold-500" size={16} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-xs py-3 pl-12 pr-4 text-stone-900 dark:text-alabaster font-sans text-sm focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center gap-3 py-4 text-xs tracking-[0.2em] font-bold bg-stone-900 dark:bg-alabaster text-white dark:text-charcoal hover:bg-gold-500 dark:hover:bg-gold-500 dark:hover:text-white transition-all rounded-xs ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'PROCESSING APPLICATION...' : 'BEGIN AUDITION'}
                                {!isLoading && <ArrowRight size={16} />}
                            </button>
                        </div>

                        <p className="text-[10px] text-center text-stone-900/30 dark:text-alabaster/30 font-sans uppercase tracking-widest pt-2 transition-colors duration-300">
                            Already a member?{' '}
                            <Link href="/signin" className="text-gold-500 hover:text-gold-500/80 transition-colors">Sign In</Link>
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
