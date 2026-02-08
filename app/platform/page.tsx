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
            "Harmonic Resonance", "Rhythmic Architecture", "The Velvet Legato",
            "Symphonic Geometry", "Atmospheric Tension", "Melodic Counterpoint",
            "Spectral Dynamics", "The Final Movement", "Mastery Plateau", "Infinite Echo"
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
        <div className="h-screen flex items-center justify-center bg-charcoal">
            <div className="w-8 h-8 border-t-2 border-gold-500 rounded-full animate-spin" />
        </div>
    );

    if (!user) return (
        <div className="h-screen flex flex-col items-center justify-center bg-charcoal text-alabaster gap-6">
            <h2 className="text-3xl font-serif tracking-tight">Access Restricted</h2>
            <p className="text-white/40 max-w-md text-center">Please sign in to access your movements and continue your mastery journey.</p>
            <a href="/signin" className="px-8 py-3 bg-gold-600 text-charcoal rounded-full font-sans text-xs uppercase tracking-widest hover:bg-gold-500 transition-colors">Sign In</a>
        </div>
    );

    if (!data) return (
        <div className="h-screen flex items-center justify-center bg-charcoal">
            <div className="w-8 h-8 border-t-2 border-gold-500 rounded-full animate-spin" />
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
        <div className="relative min-h-screen bg-charcoal flex flex-col items-center">
            {/* Top Navigation */}
            <div className="w-full flex items-center justify-between px-10 py-6 z-30">
                <button
                    onClick={() => router.push('/')}
                    className="text-alabaster font-serif text-lg tracking-tighter opacity-80 hover:opacity-100 transition-opacity"
                >
                    Logo
                </button>

                <div className="flex items-center gap-8">
                    <button className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-sans border-b border-gold-400/30 pb-1">My classes</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Progress</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">AI</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Community?</button>
                    <button className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors font-sans">Practice instruments</button>
                </div>

                <div className="flex items-center gap-6">
                    <button className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">My profile</button>
                    <button className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">Settings</button>
                    <button
                        onClick={handleLogout}
                        className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="w-full max-w-6xl px-6 flex flex-col items-center">
                <ChapterProgress
                    chapters={chapters.map(c => ({ id: c.id, title: c.title }))}
                    currentChapterId={currentChapterId || ""}
                    overallProgress={overallProgress}
                    onChapterSelect={(id) => {
                        setCurrentChapterId(id);
                        setCurrentLessonIndex(0);
                    }}
                />

                <div className="w-full mt-10 min-h-[400px]">
                    {currentLesson ? (
                        <LessonContent
                            lesson={{
                                id: currentLesson.id,
                                title: currentLesson.title,
                                videoUrl: currentLesson.videoUrl,
                                description: "Explore the depths of musical expression in this chapter. Each lesson is designed to build your technical skills while nurturing your creative intuition."
                            }}
                            currentStep={currentLessonIndex + 1}
                            totalSteps={currentChapter?.lessons.length || 1}
                            isCompleted={isLessonCompleted}
                            onBack={() => setCurrentLessonIndex(prev => Math.max(0, prev - 1))}
                            onNext={() => setCurrentLessonIndex(prev => Math.min((currentChapter?.lessons.length || 1) - 1, prev + 1))}
                            onComplete={handleComplete}
                        />
                    ) : (
                        <div className="w-full h-[400px] flex items-center justify-center border border-white/[0.05] rounded-xs bg-white/[0.01]">
                            <p className="text-white/20 font-serif italic">Select a movement to begin your journey</p>
                        </div>
                    )}
                </div>

                <ChapterList
                    chapters={chapters.map(c => ({
                        id: c.id,
                        title: c.title,
                        description: `MOVEMENT ${chapters.indexOf(c) + 1}`,
                        lessons: c.lessons.map(l => ({ id: l.id, title: l.title }))
                    }))}
                    currentChapterId={currentChapterId || ""}
                    onChapterSelect={(id) => {
                        setCurrentChapterId(id);
                        setCurrentLessonIndex(0);
                    }}
                />
            </div>
        </div>
    );
}
