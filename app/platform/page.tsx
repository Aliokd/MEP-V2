"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConstellation, ConstellationData } from '@/app/actions/lesson-actions';
import { useLanguage } from '@/context/LanguageContext';
import LearnLanding from './components/LearnLanding';
import LessonReader from './components/LessonReader';
import BankOfIdeas from './components/BankOfIdeas';
import DeepDive from './components/DeepDive';

export default function PlatformPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [data, setData] = useState<ConstellationData | null>(null);
    const [view, setView] = useState<'landing' | 'reader' | 'ideas' | 'deepDive'>('landing');

    useEffect(() => {
        if (user) {
            console.log("PlatformPage: Fetching constellation for user", user.uid);

            // Safety timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
                if (!data) {
                    console.warn("PlatformPage: Data fetch timed out, using fallback");
                    setData({
                        user: { id: user.uid, lessonProgress: [] },
                        lessonsList: [],
                        movements: []
                    });
                }
            }, 5000);

            getUserConstellation(user.uid).then(res => {
                clearTimeout(timeoutId);
                console.log("PlatformPage: Data received", {
                    movementsCount: res.movements.length,
                    lessonsCount: res.lessonsList.length
                });
                setData(res);
            }).catch(err => {
                clearTimeout(timeoutId);
                console.error("PlatformPage: Error fetching constellation", err);
                // Fallback to empty data so placeholders can show
                setData({
                    user: { id: user.uid, lessonProgress: [] },
                    lessonsList: [],
                    movements: []
                });
            });

            return () => clearTimeout(timeoutId);
        }
    }, [user]);

    useEffect(() => {
        if (data) {
            const masteredIds = data.user.lessonProgress.filter(p => p.status === 'MASTERED').map(p => p.lessonId);
            safeLocalStorageSetItem('mep-completed-lessons', JSON.stringify(masteredIds));
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }
    }, [data]);

    const translateCurriculum = (title: string): string => {
        if (!title) return title;
        const normalizedKey = title
            .toLowerCase()
            .replace(/\bthe\s+/g, '') // remove "the " prefix
            .replace(/[^a-z0-9_]/g, ' ')
            .trim()
            .replace(/\s+/g, '_');
        const translationKey = `curriculum.${normalizedKey}`;
        const translated = t(translationKey);
        return translated === translationKey ? title : translated;
    };

    const chapters = useMemo(() => {
        if (!data) return [];

        return data.movements.map(m => {
            const chapterLessons = data.lessonsList.filter(l =>
                l.movement?.title === m.title ||
                l.movement?.title === `The ${m.title}` ||
                m.title === `The ${l.movement?.title}`
            );
            return {
                id: m.id,
                title: translateCurriculum(m.title),
                lessons: chapterLessons.map(l => ({
                    ...l,
                    title: translateCurriculum(l.title)
                }))
            };
        });
    }, [data, t]);

    if (authLoading || !data) return (
        <div className="w-full max-w-6xl mx-auto mt-0 mb-20 flex flex-col gap-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
                <div 
                    key={i} 
                    className="w-full border border-stone-200/60 rounded-[20px] p-6 bg-white/40 flex justify-between items-center"
                >
                    <div className="flex flex-col gap-2.5 w-full">
                        <div className="h-5 w-48 bg-stone-300/30 rounded-full" />
                        <div className="h-3.5 w-32 bg-stone-200/20 rounded-full" />
                    </div>
                    <div className="w-5 h-5 bg-stone-300/30 rounded-full" />
                </div>
            ))}
        </div>
    );

    if (!user) return (
        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-stone-900 gap-6 p-8 bg-transparent">
            <h2 className="text-3xl font-sans font-light tracking-tight">{t('learn.access_restricted')}</h2>
            <p className="text-stone-700/80 max-w-md text-center font-medium">{t('learn.access_restricted_desc')}</p>
            <a href="/signin" className="px-10 py-5 bg-stone-900 text-[#FAF9F5] rounded-full font-sans text-base font-bold hover:opacity-90 transition-opacity">{t('learn.signin')}</a>
        </div>
    );


    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const handleComplete = (lessonId: string) => {
        setData(prev => {
            if (!prev) return prev;
            const updatedProgress = [...prev.user.lessonProgress];
            const existingIndex = updatedProgress.findIndex(p => p.lessonId === lessonId);
            if (existingIndex >= 0) {
                updatedProgress[existingIndex] = { ...updatedProgress[existingIndex], status: 'MASTERED' };
            } else {
                updatedProgress.push({ lessonId, status: 'MASTERED' });
            }
            return {
                ...prev,
                user: { ...prev.user, lessonProgress: updatedProgress }
            };
        });
    };

    return (
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col items-center">
            {view === 'landing' && (
                <LearnLanding
                    onStart={() => setView('reader')}
                    onOpenIdeas={() => setView('ideas')}
                    onOpenDeepDive={() => setView('deepDive')}
                />
            )}
            {view === 'reader' && (
                <LessonReader
                    chapters={chapters}
                    onComplete={handleComplete}
                    onBackToLanding={() => setView('landing')}
                />
            )}
            {view === 'ideas' && (
                <BankOfIdeas onBackToLanding={() => setView('landing')} />
            )}
            {view === 'deepDive' && (
                <DeepDive onBackToLanding={() => setView('landing')} />
            )}
        </div>
    );
}