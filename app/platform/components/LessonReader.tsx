"use client";

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import LessonContent from './LessonContent';
import LessonBlocks from './LessonBlocks';
import { useLanguage } from '@/context/LanguageContext';
import { isBlockRenderable, type LessonBlock } from '@/lib/lessonBlocks';

interface ReaderLesson {
    id: string;
    title: string;
    summary?: string;
    blocks?: LessonBlock[];
    videoUrl?: string;
    posterUrl?: string | null;
}

interface ReaderChapter {
    id: string;
    title: string;
    lessons: ReaderLesson[];
}

interface FlatLesson extends ReaderLesson {
    chapterTitle: string;
}

interface LessonReaderProps {
    chapters: ReaderChapter[];
    /** True while the curriculum is still being fetched, so an empty
     *  `chapters` means "not here yet" rather than "there is nothing". */
    isLoading?: boolean;
    onComplete: (lessonId: string) => void;
    onBackToLanding: () => void;
    onOpenDeepDive: () => void;
    onOpenIdeas: () => void;
}

export default function LessonReader({
    chapters,
    isLoading = false,
    onComplete,
    onBackToLanding,
    onOpenDeepDive,
    onOpenIdeas,
}: LessonReaderProps) {
    const { t, language } = useLanguage();

    const flatLessons: FlatLesson[] = React.useMemo(() => {
        return chapters.flatMap(c => c.lessons.map(l => ({ ...l, chapterTitle: c.title })));
    }, [chapters]);

    const [index, setIndex] = React.useState(0);
    // Shown once the last lesson is completed, offering somewhere to go next.
    const [isFinished, setIsFinished] = React.useState(false);

    const currentLesson = flatLessons[index];
    // A block that would draw nothing must not count, or an editor who added a
    // row and left it blank would silently replace the placeholder with a gap.
    const visibleBlocks = React.useMemo(
        () => (currentLesson?.blocks || []).filter(b => isBlockRenderable(b, language)),
        [currentLesson, language],
    );
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

    if (!currentLesson && isLoading) {
        return (
            <div className="w-full flex-1 min-h-0 flex flex-col gap-4 animate-pulse">
                <div className="shrink-0 h-6 w-52 bg-stone-300/25 rounded-full" />
                <div className="flex-1 min-h-0 flex flex-col gap-6">
                    <div className="h-9 w-2/3 max-w-md bg-stone-300/25 rounded-full" />
                    <div className="flex-1 min-h-[200px] bg-stone-300/20 rounded-[20px]" />
                </div>
            </div>
        );
    }

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
            {/* The chapter name sits beside the arrow rather than inside the
                content, so it reads as where-you-are and frees the body for the
                lesson itself. */}
            <div className="shrink-0 flex items-center gap-3 select-none">
                <button
                    onClick={onBackToLanding}
                    aria-label={t('learn.back')}
                    title={t('learn.back')}
                    className="text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
                >
                    <ArrowLeft size={18} className="stroke-[2]" />
                </button>
                <h2 className="text-base md:text-lg font-sans font-medium text-stone-700 truncate">
                    {currentLesson.chapterTitle}
                </h2>
            </div>

            {/* No card around the lesson — the content sits straight on the panel
                so the video and notes get the full width and height. */}
            <div className="w-full flex-1 min-h-0 flex flex-col gap-8">
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
                {/* Chapter name lives in the header now, so only the lesson title here. */}
                <h1 className="shrink-0 text-3xl font-sans font-light text-stone-900">{currentLesson.title}</h1>

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
                    {/* Blocks the editor arranged. They sit above the summary so a
                        lesson can open with its own material and keep the summary
                        as the closing note. */}
                    {visibleBlocks.length > 0 && <LessonBlocks blocks={visibleBlocks} />}

                    {currentLesson.summary?.trim() ? (
                        <div className="w-full text-sm text-stone-700 leading-relaxed font-sans space-y-4">
                            {/* Blank lines separate paragraphs, so a summary written in
                                the admin reads the way it was typed. */}
                            {currentLesson.summary.split(/\n{2,}/).map((paragraph, i) => (
                                <p key={i} className="whitespace-pre-line">{paragraph.trim()}</p>
                            ))}
                        </div>
                    ) : visibleBlocks.length === 0 ? (
                        // Only when the lesson carries no written content at all —
                        // blocks alone are a complete lesson and must not be followed
                        // by generic filler.
                        <div className="w-full text-sm text-stone-700 leading-relaxed font-sans space-y-4">
                            <p>{t('learn.placeholder_intro')}</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>{t('learn.placeholder_point_1')}</li>
                                <li>{t('learn.placeholder_point_2')}</li>
                                <li>{t('learn.placeholder_point_3')}</li>
                            </ul>
                        </div>
                    ) : null}
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
