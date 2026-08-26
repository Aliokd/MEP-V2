"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import LessonContent from './LessonContent';
import LessonBlocks from './LessonBlocks';
import { useLanguage } from '@/context/LanguageContext';
import { isBlockRenderable, type LessonBlock } from '@/lib/lessonBlocks';
import * as btn from './buttonStyles';

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
}

export default function LessonReader({
    chapters,
    isLoading = false,
    onComplete,
    onBackToLanding,
}: LessonReaderProps) {
    const { t, language } = useLanguage();

    const flatLessons: FlatLesson[] = React.useMemo(() => {
        return chapters.flatMap(c => c.lessons.map(l => ({ ...l, chapterTitle: c.title })));
    }, [chapters]);

    const [index, setIndex] = React.useState(0);

    const currentLesson = flatLessons[index];
    // A block that would draw nothing must not count, or an editor who added a
    // row and left it blank would silently replace the placeholder with a gap.
    const visibleBlocks = React.useMemo(
        () => (currentLesson?.blocks || []).filter(b => isBlockRenderable(b, language)),
        [currentLesson, language],
    );
    const atStart = index === 0;
    const atEnd = index >= flatLessons.length - 1;

    const contentScrollRef = React.useRef<HTMLDivElement | null>(null);

    /**
     * Land at the top of each lesson.
     *
     * Moving to lesson N+1 swaps the content but leaves the scroll position where
     * the last one ended — so Next dropped the reader into the middle of a lesson
     * they had not started, with the video and title above them.
     *
     * Both surfaces are reset because which one actually scrolls depends on the
     * breakpoint: the inner column owns it on desktop, while on a phone the Learn
     * panel is gone and the document scrolls instead. Resetting the one that
     * isn't scrolling is a no-op, so there is no need to work out which is which.
     */
    React.useEffect(() => {
        contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    }, [index]);

    const goNext = () => {
        if (!currentLesson) return;
        onComplete(currentLesson.id);
        if (!atEnd) {
            setIndex(i => i + 1);
            return;
        }
        // Finishing the chapter returns to Learn rather than stopping on an
        // interstitial. The reward is the Mind Power bar moving, so make sure it
        // is actually seen: `onComplete` above feeds the count, but the ring it
        // raises there only fires on the first action of the day. `veinote-celebrate`
        // glows every time, and the widget lives in the platform layout, so it
        // keeps glowing across the navigation.
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('veinote-celebrate'));
        }
        onBackToLanding();
    };

    const goBack = () => {
        if (!atStart) setIndex(i => i - 1);
    };

    if (!currentLesson && isLoading) {
        return (
            <div className="w-full flex-1 min-h-0 flex flex-col gap-4 px-4 md:px-0 animate-pulse">
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
                    className={`${btn.ghost('sm')} cursor-pointer`}
                >
                    {t('learn.back_to_overview')}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4 px-4 md:px-0">
            {/* Arrow and chapter name are ONE control, not a button beside a
                label: the chapter is what you are going back to, so clicking
                either half should take you there. */}
            <div className="shrink-0 flex select-none">
                <button
                    onClick={onBackToLanding}
                    aria-label={t('learn.back')}
                    title={t('learn.back')}
                    className={`${btn.plain('bare')} group min-w-0 gap-3 rounded-full py-1.5 pl-2 pr-4 -ml-2 cursor-pointer text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-900`}
                >
                    <ArrowLeft size={20} className="stroke-[2] shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span className="text-base md:text-lg font-sans font-medium truncate">
                        {currentLesson.chapterTitle}
                    </span>
                </button>
            </div>

            {/* No card around the lesson — the content sits straight on the panel
                so the video and notes get the full width and height. */}
            <div className="w-full flex-1 min-h-0 flex flex-col gap-8">
                {/* Chapter name lives in the header now, so only the lesson title here. */}
                <h1 className="shrink-0 text-3xl font-sans font-light text-stone-900">{currentLesson.title}</h1>

                {/* Video and notes scroll together inside the card so the Back/Next
                    controls stay pinned on screen no matter how long the summary is. */}
                <div ref={contentScrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-8 pr-1">
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
                    {visibleBlocks.length > 0 && <LessonBlocks blocks={visibleBlocks} locale={language} />}

                    {currentLesson.summary?.trim() ? (
                        <div className="w-full text-[17px] md:text-sm text-stone-700 leading-relaxed font-sans space-y-5 md:space-y-4">
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
                        <div className="w-full text-[17px] md:text-sm text-stone-700 leading-relaxed font-sans space-y-5 md:space-y-4">
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
                        // 56px tall and 17px on a phone, where these two are the only way
                        // through the lesson and were sitting at a desktop's 40px.
                        className={`${btn.secondary('touch')} cursor-pointer disabled:cursor-not-allowed`}
                    >
                        {t('learn.back')}
                    </button>
                    {/* On the last lesson this becomes Complete rather than a dead
                        Next: it is the only thing that marks that lesson MASTERED,
                        which is what feeds the Learn count in Mind Power. Disabling
                        it here meant the final lesson could never be completed. */}
                    <button
                        onClick={goNext}
                        className={`${btn.primary('touch')} cursor-pointer`}
                    >
                        {atEnd ? t('common.complete') : t('learn.next')}
                    </button>
                </div>
            </div>
        </div>
    );
}
