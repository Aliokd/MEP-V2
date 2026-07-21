"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { User, Mail, CreditCard } from 'lucide-react';
import SupportModal from '../components/SupportModal';

export default function ProfilePage() {
    const { user } = useAuth();
    const { t } = useLanguage();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [verificationState, setVerificationState] = useState<'idle' | 'pending' | 'success'>('idle');
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [notification, setNotification] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setEmail(user.email || '');
        }
    }, [user]);

    // Safety check just in case, though layout handles it
    if (!user) return null;

    const hasNameChanged = name !== (user.displayName || '');
    const hasEmailChanged = email !== (user.email || '');
    const hasChanges = hasNameChanged || hasEmailChanged;

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 4000);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (hasEmailChanged) {
            setPendingEmail(email);
            setVerificationState('pending');
            if (hasNameChanged) {
                await updateDisplayName(name);
            }
        } else if (hasNameChanged) {
            await updateDisplayName(name);
            showNotification('Display name updated successfully.');
        }
    };

    const updateDisplayName = async (newDisplayName: string) => {
        try {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                const mockUser = JSON.parse(mockUserJson);
                mockUser.displayName = newDisplayName;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
                return;
            }

            const { updateProfile } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: newDisplayName });
            }
        } catch (error) {
            console.error("Error updating display name:", error);
            showNotification('Failed to update display name.');
        }
    };

    const handleCompleteVerification = async () => {
        try {
            const mockUserJson = localStorage.getItem('playwright_mock_user');
            if (mockUserJson) {
                const mockUser = JSON.parse(mockUserJson);
                mockUser.email = pendingEmail;
                safeLocalStorageSetItem('playwright_mock_user', JSON.stringify(mockUser));
            } else {
                const { updateEmail } = await import('firebase/auth');
                const { auth } = await import('@/lib/firebase');
                if (auth.currentUser) {
                    await updateEmail(auth.currentUser, pendingEmail);
                }
            }

            setVerificationState('success');
            setEmail(pendingEmail);
            showNotification('Email updated successfully.');
            
            setTimeout(() => {
                setVerificationState('idle');
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Error updating email:", error);
            showNotification(t('profile.error_update_email'));
        }
    };

    return (
        <div className="space-y-12 text-stone-900 font-sans">
            <header className="space-y-4">
                <h1 className="text-4xl font-sans font-light tracking-tight text-stone-900">{t('profile.title')}</h1>
                <p className="text-stone-700 font-sans max-w-2xl text-sm font-medium">
                    {t('profile.subtitle')}
                </p>
            </header>

            <div className="grid lg:grid-cols-3 gap-12">
                {/* Main Profile Card */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white/60 border border-stone-200/80 p-8 rounded-[16px] space-y-8 shadow-xs">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-stone-900 rounded-full flex items-center justify-center text-4xl font-sans text-[#DCDDD4] font-bold">
                                {name.charAt(0) || 'M'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-sans font-bold text-stone-900">{name || 'Maestro'}</h2>
                                <p className="text-stone-700 text-xs font-bold mt-1">{t('profile.tier')}</p>
                                <p className="text-stone-700 text-sm font-medium mt-2">{email}</p>
                            </div>
                        </div>

                        {verificationState === 'idle' && (
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-stone-250">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold">{t('profile.display_name')}</label>
                                        <div className="flex items-center gap-3 bg-white/80 p-4 border border-stone-200 rounded-[12px] text-stone-900 focus-within:border-stone-400 transition-colors">
                                            <User size={16} className="text-stone-900" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder={t('profile.placeholder_name')}
                                                className="bg-transparent border-none outline-none w-full font-medium p-0 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold">{t('profile.email')}</label>
                                        <div className="flex items-center gap-3 bg-white/80 p-4 border border-stone-200 rounded-[12px] text-stone-900 focus-within:border-stone-400 transition-colors">
                                            <Mail size={16} className="text-stone-900" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="bg-transparent border-none outline-none w-full font-medium p-0 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {hasChanges && (
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 bg-stone-900 text-[#DCDDD4] hover:bg-stone-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                        >
                                            {t('profile.save_details')}
                                        </button>
                                    </div>
                                )}
                                {notification && (
                                    <p className="text-xs text-stone-600 font-medium animate-in fade-in duration-200">{notification}</p>
                                )}
                            </form>
                        )}

                        {verificationState === 'pending' && (
                            <div className="space-y-4 py-2 border-l-2 border-stone-400 pl-4 animate-in fade-in duration-200 pt-6 border-t border-stone-250">
                                <p className="text-sm font-semibold text-stone-800">{t('profile.verify_title')}</p>
                                <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                    {t('profile.verify_sent')} <span className="font-semibold text-stone-700">{pendingEmail}</span>{t('profile.verify_sent_end')}
                                </p>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <a
                                        href="https://mail.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 text-stone-700 text-xs font-semibold rounded-lg transition-all"
                                    >
                                        {t('profile.open_gmail')}
                                    </a>
                                    <button
                                        onClick={handleCompleteVerification}
                                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200/60 border border-stone-200 text-stone-850 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                    >
                                        {t('profile.simulate_click')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setVerificationState('idle');
                                            setEmail(user.email || '');
                                        }}
                                        className="px-4 py-2 text-stone-500 hover:text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                        {t('profile.cancel')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {verificationState === 'success' && (
                            <div className="py-2 border-l-2 border-emerald-500 pl-4 animate-in fade-in duration-200 pt-6 border-t border-stone-250">
                                <p className="text-sm font-semibold text-emerald-700">✓ {t('profile.success_title')}</p>
                                <p className="text-xs text-emerald-600 font-medium mt-1">{t('profile.success_desc')} {email}{t('profile.returning_platform')}</p>
                            </div>
                        )}
                    </section>

                    <section className="bg-white/60 border border-stone-200/80 p-8 rounded-[16px] space-y-6 shadow-xs">
                        <h3 className="text-xl font-sans font-bold border-b border-stone-200 pb-4">{t('profile.preferences')}</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 hover:bg-stone-200/30 rounded-[12px] transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">{t('profile.notifications_title')}</p>
                                    <p className="text-xs text-stone-700 font-medium">{t('profile.notifications_desc')}</p>
                                </div>
                                <div className="w-10 h-6 bg-stone-900/10 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-stone-900 rounded-full shadow-lg" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 hover:bg-stone-200/30 rounded-[12px] transition-colors cursor-pointer group">
                                <div className="space-y-1">
                                    <p className="font-sans text-sm font-bold text-stone-900 group-hover:text-stone-950 transition-colors">{t('profile.public_profile_title')}</p>
                                    <p className="text-xs text-stone-700 font-medium">{t('profile.public_profile_desc')}</p>
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
                            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-700 font-bold mb-2">{t('profile.current_plan')}</p>
                            <h3 className="text-2xl font-sans font-bold text-stone-900">{t('profile.virtuoso_membership')}</h3>
                            <p className="text-stone-700 text-xs font-semibold mt-2">$29.99 / month</p>
                        </div>
                        <button className="w-full py-5 bg-stone-900 text-[#DCDDD4] text-base font-bold hover:bg-stone-800 transition-colors rounded-full">
                            {t('profile.manage_subscription')}
                        </button>
                    </div>

                    <div className="bg-white/60 p-6 rounded-[16px] text-center border border-stone-200/80 shadow-xs">
                        <p className="text-xs text-stone-700 font-semibold mb-4">{t('profile.need_assistance')}</p>
                        <button 
                            onClick={() => setIsSupportOpen(true)}
                            className="text-stone-900 text-sm font-bold hover:underline"
                        >
                            {t('profile.contact_concierge')}
                        </button>
                    </div>
                </div>
            </div>
            
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        </div>
    );
}