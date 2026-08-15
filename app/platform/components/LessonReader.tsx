"use client";

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import LessonContent from './LessonContent';
import { useLanguage } from '@/context/LanguageContext';

interface ReaderChapter {
    id: string;
    title: string;
    lessons: { id: string; title: string; summary?: string; videoUrl?: string; posterUrl?: string | null }[];
}

interface FlatLesson {
    id: string;
    title: string;
    summary?: string;
    videoUrl?: string;
    posterUrl?: string | null;
    chapterTitle: string;
}

interface LessonReaderProps {
    chapters: ReaderChapter[];
    onComplete: (lessonId: string) => void;
    onBackToLanding: () => void;
    onOpenDeepDive: () => void;
    onOpenIdeas: () => void;
}

export default function LessonReader({
    chapters,
    onComplete,
    onBackToLanding,
    onOpenDeepDive,
    onOpenIdeas,
}: LessonReaderProps) {
    const { t } = useLanguage();

    const flatLessons: FlatLesson[] = React.useMemo(() => {
        return chapters.flatMap(c => c.lessons.map(l => ({ ...l, chapterTitle: c.title })));
    }, [chapters]);

    const [index, setIndex] = React.useState(0);
    // Shown once the last lesson is completed, offering somewhere to go next.
    const [isFinished, setIsFinished] = React.useState(false);

    const currentLesson = flatLessons[index];
    const atStart = index === 0;
    const atEnd = index >= flatLessons.length - 1;

    const goNext = () => {
        if (!currentLesson) return;
        onComplete(currentLesson.id);
        if (atEnd) {
            setIsFinished(true);
        } else {
            setIndex(i => i + 1);
        }
    };

    const goBack = () => {
        if (isFinished) {
            setIsFinished(false);
            return;
        }
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
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4">
            {/* Same treatment as the Practice section's back control, so leaving a
                lesson looks the same as leaving a practice. */}
            <button
                onClick={onBackToLanding}
                className="shrink-0 self-start flex items-center gap-2 text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            >
                <ArrowLeft size={16} className="stroke-[2]" />
                {t('learn.back')}
            </button>

            <div className="w-full flex-1 min-h-0 bg-[#FAF9F5] border border-stone-300/85 rounded-[20px] p-8 flex flex-col gap-8 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
                {isFinished ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-8 px-4">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-sans font-light text-stone-900">
                                {t('learn.chapter_complete_title')}
                            </h1>
                            <p className="text-sm text-stone-500 font-sans">
                                {t('learn.chapter_complete_desc')}
                            </p>
                        </div>

                        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={onOpenDeepDive}
                                className="group flex items-center justify-between gap-3 text-left px-6 py-5 rounded-[16px] bg-white border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer active:scale-[0.99]"
                            >
                                <span className="text-base font-sans font-medium text-stone-800">
                                    {t('learn.deep_dive')}
                                </span>
                                <ArrowRight size={18} className="text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>

                            <button
                                onClick={onOpenIdeas}
                                className="group flex items-center justify-between gap-3 text-left px-6 py-5 rounded-[16px] bg-white border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer active:scale-[0.99]"
                            >
                                <span className="text-base font-sans font-medium text-stone-800">
                                    {t('learn.bank_of_ideas')}
                                </span>
                                <ArrowRight size={18} className="text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                        </div>

                        <button
                            onClick={goBack}
                            className="flex items-center gap-2 text-sm font-sans text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={16} className="stroke-[2]" />
                            {t('learn.back')}
                        </button>
                    </div>
                ) : (
                <>
                <div className="shrink-0 flex flex-col gap-1">
                    <span className="text-sm text-stone-400 font-sans">{currentLesson.chapterTitle}</span>
                    <h1 className="text-3xl font-sans font-light text-stone-900">{currentLesson.title}</h1>
                </div>

                {/* Video and notes scroll together inside the card so the Back/Next
                    controls stay pinned on screen no matter how long the summary is. */}
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-8 pr-1">
                    <LessonContent
                        key={currentLesson.id}
                        lesson={{
                            id: currentLesson.id,
                            title: currentLesson.title,
                            videoUrl: currentLesson.videoUrl || '',
                            posterUrl: currentLesson.posterUrl || undefined,
                        }}
                        isActive
                        onVideoEnd={goNext}
                    />
                    <div className="w-full text-sm text-stone-700 leading-relaxed font-sans space-y-4">
                        {currentLesson.summary?.trim() ? (
                            // Blank lines separate paragraphs, so a summary written in
                            // the admin reads the way it was typed.
                            currentLesson.summary
                                .split(/\n{2,}/)
                                .map((paragraph, i) => (
                                    <p key={i} className="whitespace-pre-line">{paragraph.trim()}</p>
                                ))
                        ) : (
                            <>
                                <p>{t('learn.placeholder_intro')}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{t('learn.placeholder_point_1')}</li>
                                    <li>{t('learn.placeholder_point_2')}</li>
                                    <li>{t('learn.placeholder_point_3')}</li>
                                </ul>
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex items-center justify-between gap-4 border-t border-stone-200/60 pt-6">
                    <button
                        onClick={goBack}
                        disabled={atStart}
                        className="px-6 py-3 bg-stone-200/70 hover:bg-stone-300/70 text-stone-700 text-sm font-semibold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                        {t('learn.back')}
                    </button>
                    {/* On the last lesson this becomes Complete rather than a dead
                        Next: it is the only thing that marks that lesson MASTERED,
                        which is what feeds the Learn count in Mind Power. Disabling
                        it here meant the final lesson could never be completed. */}
                    <button
                        onClick={goNext}
                        className="px-6 py-3 bg-[#87b884] hover:bg-[#7cb378] active:bg-[#6fa06b] text-[#1c331a] text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                        {atEnd ? t('common.complete') : t('learn.next')}
                    </button>
                </div>
                </>
                )}
            </div>
        </div>
    );
}
