"use client";

import React from 'react';
import LessonContent from './LessonContent';
import { useLanguage } from '@/context/LanguageContext';

interface ReaderChapter {
    id: string;
    title: string;
    lessons: { id: string; title: string; videoUrl?: string }[];
}

interface FlatLesson {
    id: string;
    title: string;
    videoUrl?: string;
    chapterTitle: string;
}

interface LessonReaderProps {
    chapters: ReaderChapter[];
    onComplete: (lessonId: string) => void;
    onBackToLanding: () => void;
}

export default function LessonReader({ chapters, onComplete, onBackToLanding }: LessonReaderProps) {
    const { t } = useLanguage();

    const flatLessons: FlatLesson[] = React.useMemo(() => {
        return chapters.flatMap(c => c.lessons.map(l => ({ ...l, chapterTitle: c.title })));
    }, [chapters]);

    const [index, setIndex] = React.useState(0);

    const currentLesson = flatLessons[index];
    const atStart = index === 0;
    const atEnd = index >= flatLessons.length - 1;

    const goNext = () => {
        if (!currentLesson) return;
        onComplete(currentLesson.id);
        if (!atEnd) setIndex(i => i + 1);
    };

    const goBack = () => {
        if (!atStart) setIndex(i => i - 1);
    };

    if (!currentLesson) {
        return (
            <div className="w-full mb-20 flex flex-col items-center justify-center py-24 gap-4 text-stone-500">
                <p className="text-sm font-medium">{t('learn.no_lessons_yet')}</p>
                <button
                    onClick={onBackToLanding}
                    className="text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                >
                    {t('learn.back_to_overview')}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full mb-20 flex flex-col gap-4">
            <button
                onClick={onBackToLanding}
                className="self-start flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors font-sans font-medium cursor-pointer"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t('learn.back_to_overview')}
            </button>

            <div className="w-full bg-white border border-stone-300/85 rounded-[20px] p-8 flex flex-col gap-8 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
                <div className="flex flex-col gap-1">
                    <span className="text-sm text-stone-400 font-sans">{currentLesson.chapterTitle}</span>
                    <h1 className="text-3xl font-sans font-light text-stone-900">{currentLesson.title}</h1>
                </div>

                <div className="flex flex-col gap-8">
                    <LessonContent
                        key={currentLesson.id}
                        lesson={{
                            id: currentLesson.id,
                            title: currentLesson.title,
                            videoUrl: currentLesson.videoUrl || '',
                        }}
                        isActive
                        onVideoEnd={goNext}
                    />
                    <div className="w-full text-sm text-stone-700 leading-relaxed font-sans space-y-4">
                        <p>{t('learn.placeholder_intro')}</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>{t('learn.placeholder_point_1')}</li>
                            <li>{t('learn.placeholder_point_2')}</li>
                            <li>{t('learn.placeholder_point_3')}</li>
                        </ul>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-stone-200/60 pt-6">
                    <button
                        onClick={goBack}
                        disabled={atStart}
                        className="px-6 py-3 bg-stone-200/70 hover:bg-stone-300/70 text-stone-700 text-sm font-semibold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                        {t('learn.back')}
                    </button>
                    <button
                        onClick={goNext}
                        disabled={atEnd}
                        className="px-6 py-3 bg-[#87b884] hover:bg-[#7cb378] active:bg-[#6fa06b] text-[#1c331a] text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                    >
                        {t('learn.next')}
                    </button>
                </div>
            </div>
        </div>
    );
}
