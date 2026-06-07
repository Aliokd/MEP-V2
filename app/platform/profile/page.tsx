"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, CreditCard } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();

    // Safety check just in case, though layout handles it
    if (!user) return null;

    return (
        <div className="space-y-12 text-stone-900 font-sans">
            <header className="space-y-4">
                <h1 className="text-4xl font-sans font-light tracking-tight text-stone-900">Profile & settings</h1>
                <p className="text-stone-700 font-sans max-w-2xl text-sm font-medium">
                    Manage your account details and preferences.
                </p>
            </header>

            <div className="grid lg:grid-cols-3 gap-12">
                {/* Main Profile Card */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white/60 border border-stone-200/80 p-8 rounded-[16px] space-y-8 shadow-xs">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-stone-900 rounded-full flex items-center justify-center text-4xl font-sans text-[#DCDDD4] font-bold">
                                {user.displayName?.charAt(0) || 'M'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-sans font-bold text-stone-900">{user.displayName || 'Maestro'}</h2>
                                <p className="text-stone-700 text-xs font-bold mt-1">Virtuoso tier</p>
                                <p className="text-stone-700 text-sm font-medium mt-2">{user.email}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-stone-250">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold">Display Name</label>
                                <div className="flex items-center gap-3 bg-white/80 p-4 border border-stone-200 rounded-[12px] text-stone-900">
                                    <User size={16} className="text-stone-900" />
                                    <span className="font-medium">{user.displayName || 'Set a display name'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold">Email Address</label>
                                <div className="flex items-center gap-3 bg-white/80 p-4 border border-stone-200 rounded-[12px] text-stone-900">
                                    <Mail size={16} className="text-stone-900" />
                                    <span className="font-medium">{user.email}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/60 border border-stone-200/80 p-8 rounded-[16px] space-y-6 shadow-xs">
                        <h3 className="text-xl font-sans font-bold border-b border-stone-200 pb-4">Preferences</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 hover:bg-stone-200/30 rounded-[12px] transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">Email Notifications</p>
                                    <p className="text-xs text-stone-700 font-medium">Receive updates on new modules and masterclass events.</p>
                                </div>
                                <div className="w-10 h-6 bg-stone-900/10 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-stone-900 rounded-full shadow-lg" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 hover:bg-stone-200/30 rounded-[12px] transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">Public Profile</p>
                                    <p className="text-xs text-stone-700 font-medium">Allow other students to see your constellation progress.</p>
                                </div>
                                <div className="w-10 h-6 bg-stone-200 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-stone-400 rounded-full shadow-lg" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar / Plan Info */}
                <div className="space-y-6">
                    <div className="bg-white/80 border border-stone-200/80 p-8 rounded-[16px] space-y-6 text-center shadow-xs">
                        <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto text-[#DCDDD4]">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-700 font-bold mb-2">Current plan</p>
                            <h3 className="text-2xl font-sans font-bold text-stone-900">Virtuoso membership</h3>
                            <p className="text-stone-700 text-xs font-semibold mt-2">$29.99 / month</p>
                        </div>
                        <button className="w-full py-5 bg-stone-900 text-[#DCDDD4] text-base font-bold hover:bg-stone-800 transition-colors rounded-full">
                            Manage subscription
                        </button>
                    </div>

                    <div className="bg-white/60 p-6 rounded-[16px] text-center border border-stone-200/80 shadow-xs">
                        <p className="text-xs text-stone-700 font-semibold mb-4">Need assistance?</p>
                        <button className="text-stone-900 text-sm font-bold hover:underline">Contact concierge</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
