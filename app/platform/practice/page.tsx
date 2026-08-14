"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import PracticeTab from './components/PracticeTab';
// Shared with MaestroSidebar so the locked tab and its greyed-out nav entry
// can never disagree about whether Practice is available.
import { PRACTICE_ENABLED } from '@/lib/uiFlags';

export default function PracticePage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();

    // Track active session practice time (accumulate seconds spent in Practice tab).
    // Paused while the tab is locked — a "coming soon" screen isn't practice time.
    useEffect(() => {
        if (!PRACTICE_ENABLED) return;
        const interval = setInterval(() => {
            const storedSeconds = parseInt(localStorage.getItem('mep-practice-seconds') || '0');
            const nextSeconds = storedSeconds + 10; // add 10 seconds
            safeLocalStorageSetItem('mep-practice-seconds', nextSeconds.toString());

            // Dispatch event to update the platform header progress calculations
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }, 10000); // every 10 seconds
        return () => clearInterval(interval);
    }, []);

    if (authLoading) return (
        <div className="flex-1 min-h-[400px] flex items-center justify-center bg-transparent">
            <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!user) return null;

    if (!PRACTICE_ENABLED) {
        return (
            <div className="w-full min-h-[60vh] flex items-center justify-center px-6 py-10">
                <div className="flex flex-col items-center text-center gap-4 max-w-md">
                    <h1 className="font-serif font-normal text-3xl md:text-4xl text-stone-900">
                        {t('practice.locked_title')}
                    </h1>
                    <span className="inline-block bg-stone-100 text-stone-500 rounded-full px-4 py-1.5 text-sm font-sans">
                        {t('common.coming_soon')}
                    </span>
                    <p className="text-stone-500 text-sm font-sans leading-relaxed">
                        {t('practice.locked_desc')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <PracticeTab />
        </div>
    );
}
