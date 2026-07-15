"use client";

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConstellation, ConstellationData } from '@/app/actions/lesson-actions';
import { useLanguage } from '@/context/LanguageContext';
import ChapterList from './components/ChapterList';
import Logo from '@/components/Logo';
import Link from 'next/link';

export default function PlatformPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [data, setData] = useState<ConstellationData | null>(null);
    const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

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
                if (res.movements.length > 0) {
                    setCurrentChapterId(res.movements[0].id);
                }
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
            localStorage.setItem('mep-completed-lessons', JSON.stringify(masteredIds));
            window.dispatchEvent(new CustomEvent('songwriting-progress-updated'));
        }
    }, [data]);

    const chapters = useMemo(() => {
        if (!data) return [];

        const realChapters = data.movements.map(m => ({
            id: m.id,
            title: m.title,
            lessons: data.lessonsList.filter(l =>
                l.movement?.title === m.title ||
                l.movement?.title === `The ${m.title}` ||
                m.title === `The ${l.movement?.title}`
            )
        }));

        // Fill up to 10 chapters with placeholders
        const placeholderTitles = [
            "Harmonic resonance", "Rhythmic architecture", "The velvet legato",
            "Symphonic geometry", "Atmospheric tension", "Melodic counterpoint",
            "Spectral dynamics", "The final movement", "Mastery plateau", "Infinite echo"
        ];

        const allChapters = [...realChapters];
        while (allChapters.length < 10) {
            const index = allChapters.length;
            allChapters.push({
                id: `placeholder-${index}`,
                title: placeholderTitles[index] || `Advanced Movement ${index + 1}`,
                lessons: [
                    { id: `l-${index}-1`, title: "Introduction to Theory" },
                    { id: `l-${index}-2`, title: "Technical Proficiency" },
                    { id: `l-${index}-3`, title: "Emotional Expression" }
                ] as any
            });
        }

        return allChapters;
    }, [data]);

    const currentChapter = useMemo(() => {
        return chapters.find(c => c.id === currentChapterId);
    }, [chapters, currentChapterId]);

    const currentLesson = useMemo(() => {
        if (!currentChapter || currentChapter.lessons.length === 0) return null;
        return currentChapter.lessons[currentLessonIndex] || currentChapter.lessons[0];
    }, [currentChapter, currentLessonIndex]);

    const overallProgress = useMemo(() => {
        if (!data || data.lessonsList.length === 0) return 0;
        const completed = data.user.lessonProgress.filter(p => p.status === 'MASTERED').length;
        return Math.round((completed / data.lessonsList.length) * 100);
    }, [data]);

    const isLessonCompleted = useMemo(() => {
        if (!data || !currentLesson) return false;
        return data.user.lessonProgress.some(p => p.lessonId === currentLesson.id && p.status === 'MASTERED');
    }, [data, currentLesson]);

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

    const handleComplete = () => {
        if (!currentLesson) return;
        setData(prev => {
            if (!prev) return prev;
            const updatedProgress = [...prev.user.lessonProgress];
            const existingIndex = updatedProgress.findIndex(p => p.lessonId === currentLesson.id);
            if (existingIndex >= 0) {
                updatedProgress[existingIndex] = { ...updatedProgress[existingIndex], status: 'MASTERED' };
            } else {
                updatedProgress.push({ lessonId: currentLesson.id, status: 'MASTERED' });
            }
            return {
                ...prev,
                user: { ...prev.user, lessonProgress: updatedProgress }
            };
        });
    };

    const handleNextChapter = () => {
        if (!currentChapterId) return;
        const currentIdx = chapters.findIndex(c => c.id === currentChapterId);
        if (currentIdx !== -1 && currentIdx < chapters.length - 1) {
            const nextChapter = chapters[currentIdx + 1];
            setCurrentChapterId(nextChapter.id);
            setCurrentLessonIndex(0);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
            <ChapterList
                chapters={chapters.map(c => ({
                    id: c.id,
                    title: c.title,
                    description: `MOVEMENT ${chapters.indexOf(c) + 1}`,
                    lessons: c.lessons.map(l => ({ id: l.id, title: l.title, videoUrl: l.videoUrl }))
                }))}
                currentChapterId={currentChapterId || ""}
                currentLesson={currentLesson}
                currentLessonIndex={currentLessonIndex}
                masteredLessonIds={data.user.lessonProgress.filter(p => p.status === 'MASTERED').map(p => p.lessonId)}
                onChapterSelect={(id) => {
                    setCurrentChapterId(id);
                    setCurrentLessonIndex(0);
                }}
                onLessonSelect={(index) => setCurrentLessonIndex(index)}
                onBack={() => setCurrentLessonIndex(prev => Math.max(0, prev - 1))}
                onNext={() => setCurrentLessonIndex(prev => Math.min((currentChapter?.lessons.length || 1) - 1, prev + 1))}
                onComplete={handleComplete}
                onNextChapter={handleNextChapter}
            />
        </div>
    );
}
