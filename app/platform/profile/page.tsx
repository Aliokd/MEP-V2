"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { User, Mail } from 'lucide-react';
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
        <div className="space-y-10 text-stone-900 font-sans">
            <header className="space-y-2">
                <h1 className="text-3xl font-sans font-light tracking-tight text-stone-900">{t('profile.title')}</h1>
                <p className="text-stone-500 font-sans max-w-2xl text-sm font-normal">
                    {t('profile.subtitle')}
                </p>
            </header>

            <div className="grid lg:grid-cols-3 gap-12">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Identity */}
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center text-3xl font-sans text-[#DCDDD4] font-medium">
                            {name.charAt(0) || 'M'}
                        </div>
                        <div>
                            <h2 className="text-xl font-sans font-semibold text-stone-900">{name || 'Maestro'}</h2>
                            <p className="text-stone-500 text-xs font-medium mt-1">{t('profile.tier')} · {email}</p>
                        </div>
                    </div>

                    <div className="h-px bg-stone-200/60" />

                    {/* Details form */}
                    {verificationState === 'idle' && (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-400 font-medium">{t('profile.display_name')}</label>
                                    <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                        <User size={15} className="text-stone-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('profile.placeholder_name')}
                                            className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-stone-400 font-medium">{t('profile.email')}</label>
                                    <div className="flex items-center gap-2.5 border-b border-stone-300 focus-within:border-stone-500 transition-colors py-2">
                                        <Mail size={15} className="text-stone-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full font-medium text-stone-800 p-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>
                            {hasChanges && (
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-stone-900 text-[#DCDDD4] hover:bg-stone-800 text-xs font-semibold rounded-full transition-all cursor-pointer"
                                    >
                                        {t('profile.save_details')}
                                    </button>
                                </div>
                            )}
                            {notification && (
                                <p className="text-xs text-stone-500 font-medium animate-in fade-in duration-200">{notification}</p>
                            )}
                        </form>
                    )}

                    {verificationState === 'pending' && (
                        <div className="space-y-4 py-2 border-l-2 border-stone-300 pl-4 animate-in fade-in duration-200">
                            <p className="text-sm font-semibold text-stone-800">{t('profile.verify_title')}</p>
                            <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                {t('profile.verify_sent')} <span className="font-semibold text-stone-700">{pendingEmail}</span>{t('profile.verify_sent_end')}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <a
                                    href="https://mail.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 text-stone-700 text-xs font-semibold rounded-full transition-all"
                                >
                                    {t('profile.open_gmail')}
                                </a>
                                <button
                                    onClick={handleCompleteVerification}
                                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200/60 border border-stone-200 text-stone-700 text-xs font-semibold rounded-full transition-all cursor-pointer"
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
                        <div className="py-2 border-l-2 border-emerald-500 pl-4 animate-in fade-in duration-200">
                            <p className="text-sm font-semibold text-emerald-700">✓ {t('profile.success_title')}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">{t('profile.success_desc')} {email}{t('profile.returning_platform')}</p>
                        </div>
                    )}

                    <div className="h-px bg-stone-200/60" />

                    {/* Preferences */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-sans font-semibold text-stone-700 mb-3">{t('profile.preferences')}</h3>
                        <div className="flex items-center justify-between py-4 border-b border-stone-200/60">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.notifications_title')}</p>
                                <p className="text-xs text-stone-500">{t('profile.notifications_desc')}</p>
                            </div>
                            <div className="w-10 h-6 bg-stone-900/10 rounded-full relative shrink-0 ml-4">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-stone-900 rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <p className="font-sans text-sm font-medium text-stone-800">{t('profile.public_profile_title')}</p>
                                <p className="text-xs text-stone-500">{t('profile.public_profile_desc')}</p>
                            </div>
                            <div className="w-10 h-6 bg-stone-200 rounded-full relative shrink-0 ml-4">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-stone-400 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Plan Info */}
                <div className="space-y-6">
                    <div className="bg-white/60 border border-stone-200/70 p-7 rounded-[16px] space-y-5 text-center">
                        <div>
                            <p className="text-xs text-stone-400 font-medium mb-1.5">{t('profile.current_plan')}</p>
                            <h3 className="text-xl font-sans font-semibold text-stone-900">{t('profile.virtuoso_membership')}</h3>
                            <p className="text-stone-500 text-xs font-medium mt-1">$29.99 / month</p>
                        </div>
                        <button className="w-full py-3 bg-[#86BE7F]/15 hover:bg-[#86BE7F]/25 text-[#3f6a3a] text-sm font-semibold rounded-full transition-colors cursor-pointer">
                            {t('profile.upgrade_to_max')}
                        </button>
                        <button className="text-stone-500 hover:text-stone-800 text-xs font-medium hover:underline transition-colors cursor-pointer">
                            {t('profile.manage_subscription')}
                        </button>
                    </div>

                    <p className="text-center text-xs text-stone-500">
                        {t('profile.need_assistance')}{' '}
                        <button
                            onClick={() => setIsSupportOpen(true)}
                            className="text-stone-800 font-semibold hover:underline"
                        >
                            {t('profile.contact_concierge')}
                        </button>
                    </p>
                </div>
            </div>

            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        </div>
    );
}