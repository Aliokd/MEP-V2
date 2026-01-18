"use client";

import { useAuth } from '@/context/AuthContext';
import { User, Mail, Settings, CreditCard } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
    const { user } = useAuth();

    // Safety check just in case, though layout handles it
    if (!user) return null;

    return (
        <div className="p-10 space-y-12 min-h-screen bg-charcoal text-alabaster">
            <header className="space-y-4">
                <h1 className="text-4xl font-serif text-alabaster">Profile & Settings</h1>
                <p className="text-stone-400 font-sans max-w-2xl">
                    Manage your account details and preferences.
                </p>
            </header>

            <div className="grid lg:grid-cols-3 gap-12">
                {/* Main Profile Card */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white/5 border border-white/5 p-8 rounded-xs space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gold-500 rounded-full flex items-center justify-center text-4xl font-serif text-charcoal font-bold">
                                {user.displayName?.charAt(0) || 'M'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif">{user.displayName || 'Maestro'}</h2>
                                <p className="text-gold-500 text-xs uppercase tracking-widest mt-1">Virtuoso Tier</p>
                                <p className="text-white/40 text-sm mt-2">{user.email}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Display Name</label>
                                <div className="flex items-center gap-3 bg-black/40 p-4 border border-white/10 rounded-xs text-white/80">
                                    <User size={16} className="text-gold-500" />
                                    <span>{user.displayName || 'Set a display name'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email Address</label>
                                <div className="flex items-center gap-3 bg-black/40 p-4 border border-white/10 rounded-xs text-white/80">
                                    <Mail size={16} className="text-gold-500" />
                                    <span>{user.email}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/5 border border-white/5 p-8 rounded-xs space-y-6">
                        <h3 className="text-xl font-serif border-b border-white/5 pb-4">Preferences</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xs transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm group-hover:text-gold-500 transition-colors">Email Notifications</p>
                                    <p className="text-xs text-white/40">Receive updates on new modules and masterclass events.</p>
                                </div>
                                <div className="w-10 h-6 bg-gold-500/20 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-gold-500 rounded-full shadow-lg" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xs transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm group-hover:text-gold-500 transition-colors">Public Profile</p>
                                    <p className="text-xs text-white/40">Allow other students to see your constellation progress.</p>
                                </div>
                                <div className="w-10 h-6 bg-white/10 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full shadow-lg" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar / Plan Info */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gold-500/20 to-transparent border border-gold-500/30 p-8 rounded-xs space-y-6 text-center">
                        <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto text-charcoal shadow-glow">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-500 font-bold mb-2">Current Plan</p>
                            <h3 className="text-2xl font-serif text-white">Virtuoso Membership</h3>
                            <p className="text-white/60 text-xs mt-2">$29.99 / month</p>
                        </div>
                        <button className="w-full py-3 bg-gold-500 text-charcoal text-xs font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-xs">
                            Manage Subscription
                        </button>
                    </div>

                    <div className="bg-white/5 p-6 rounded-xs text-center border border-white/5">
                        <p className="text-xs text-white/40 mb-4">Need assistance?</p>
                        <button className="text-gold-500 text-xs uppercase tracking-widest hover:underline">Contact Concierge</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
