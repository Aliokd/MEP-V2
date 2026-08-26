"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConstellation, ConstellationData } from '@/app/actions/lesson-actions';
import { useLanguage } from '@/context/LanguageContext';
import * as btn from '@/app/platform/components/buttonStyles';
import { fetchCurriculum } from '@/lib/contentClient';
import { pickLocale, type LearnChapter, type LearnLesson } from '@/lib/content';
import LearnLanding from './components/LearnLanding';
import LessonReader from './components/LessonReader';
import BankOfIdeas from './components/BankOfIdeas';
import DeepDive from './components/DeepDive';

export default function PlatformPage() {
    const { user, loading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const [data, setData] = useState<ConstellationData | null>(null);
    const [view, setView] = useState<'landing' | 'reader' | 'ideas' | 'deepDive'>('landing');
    const [cms, setCms] = useState<(LearnChapter & { lessons: LearnLesson[] })[] | null>(null);

    // The curriculum is authored in the admin CMS. Data Connect stays as the
    // source for lesson *progress* and as the fallback for the lesson list until
    // the content migration has been run.
    useEffect(() => {
        let cancelled = false;
        fetchCurriculum()
            .then(chapters => { if (!cancelled) setCms(chapters); })
            .catch(err => {
                console.warn("Falling back to Data Connect curriculum:", err);
                if (!cancelled) setCms([]);
            });
        return () => { cancelled = true; };
    }, []);

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

    const chapters = useMemo(() => {
        // CMS content wins when there is any, and it is already localized —
        // no need for the title-matching translation lookup below.
        if (cms && cms.length > 0) {
            return cms.map(chapter => ({
                id: chapter.id,
                title: pickLocale(chapter.title, language),
                lessons: chapter.lessons.map(lesson => ({
                    id: lesson.id,
                    title: pickLocale(lesson.title, language),
                    // The written content an editor typed into Summary. Dropping it
                    // here is why published text never reached the lesson page.
                    summary: pickLocale(lesson.summary, language),
                    // Structured content blocks — text, images, audio, embeds.
                    blocks: lesson.blocks || [],
                    videoUrl: lesson.videoUrl,
                    posterUrl: lesson.posterUrl ?? null,
                    midiDataUrl: lesson.midiDataUrl ?? null,
                    durationSeconds: lesson.durationSeconds,
                    order: lesson.order,
                })),
            }));
        }

        if (!data) return [];

        // Data Connect titles are authored in English and go through the
        // curriculum translation table. This lives inside the memo rather than in
        // the component body on purpose: as a body-level function it was rebuilt
        // every render, the memo's declared deps could not match the inferred
        // ones, and React Compiler bailed out of optimising this entire page.
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
    }, [cms, data, language, t]);

    // Only auth gates the section. The landing needs neither the CMS curriculum
    // nor the Data Connect progress, so making it wait on `data` held the whole
    // of Learn behind a skeleton for the length of a server-action round trip —
    // up to the 5s fallback timeout above — every single visit. The curriculum
    // keeps loading in the background and is awaited only where it is used.
    if (authLoading) return (
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
            <a href="/signin" className={btn.primary('lg')}>{t('learn.signin')}</a>
        </div>
    );


    const handleComplete = (lessonId: string) => {
        setData(prev => {
            // The reader can now open before the constellation lands, so record
            // the completion against a fresh shell rather than dropping it.
            if (!prev) return {
                user: { id: user.uid, lessonProgress: [{ lessonId, status: 'MASTERED' as const }] },
                lessonsList: [],
                movements: [],
            };
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
        // The landing runs the full width of the panel: it is a row of three
        // cards, and capping it left a wide empty margin on either side of large
        // screens. The other views stay capped — the reader and the tips deck are
        // reading surfaces, and a line of text that wide is hard to follow.
        <div
            className={`w-full h-full flex flex-col items-center ${
                view === 'landing' ? '' : 'max-w-6xl mx-auto'
            }`}
        >
            {view === 'landing' && (
                <LearnLanding
                    onStart={() => setView('reader')}
                    onOpenIdeas={() => setView('ideas')}
                />
            )}
            {view === 'reader' && (
                <LessonReader
                    chapters={chapters}
                    // Distinguishes "still fetching" from "genuinely no lessons",
                    // now that the reader can open before either source has landed.
                    isLoading={cms === null || (cms.length === 0 && !data)}
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