"use client";

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConstellation, ConstellationData } from '@/app/actions/lesson-actions';
import ChapterProgress from './components/ChapterProgress';
import LessonContent from './components/LessonContent';
import ChapterList from './components/ChapterList';
import Logo from '@/components/Logo';
import Link from 'next/link';

export default function PlatformPage() {
    const { user, loading: authLoading } = useAuth();
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

    if (authLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#DCDDD4]">
            <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!user) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#DCDDD4] text-stone-900 gap-6">
            <h2 className="text-3xl font-sans font-light tracking-tight">Access restricted</h2>
            <p className="text-stone-700/80 max-w-md text-center font-medium">Please sign in to access your movements and continue your mastery journey.</p>
            <a href="/signin" className="px-10 py-5 bg-stone-900 text-[#DCDDD4] rounded-full font-sans text-base font-bold hover:opacity-90 transition-opacity">Sign in</a>
        </div>
    );

    if (!data) return (
        <div className="h-screen flex items-center justify-center bg-[#DCDDD4]">
            <div className="w-8 h-8 border-t-2 border-stone-900 rounded-full animate-spin" />
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
            />
        </div>
    );
}
