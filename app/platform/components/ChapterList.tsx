"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LessonContent from './LessonContent';

interface Chapter {
    id: string;
    title: string;
    description?: string;
    lessons: { id: string; title: string, videoUrl?: string }[];
}

interface ChapterListProps {
    chapters: Chapter[];
    currentChapterId: string;
    currentLesson: any;
    currentLessonIndex: number;
    masteredLessonIds: string[];
    onChapterSelect: (id: string) => void;
    onLessonSelect: (index: number) => void;
    onBack: () => void;
    onNext: () => void;
    onComplete: () => void;
    onNextChapter?: () => void;
}

export default function ChapterList({
    chapters,
    currentChapterId,
    currentLesson,
    currentLessonIndex,
    masteredLessonIds,
    onChapterSelect,
    onLessonSelect,
    onBack,
    onNext,
    onComplete,
    onNextChapter,
}: ChapterListProps) {
    const [videoProgress, setVideoProgress] = React.useState<Record<string, number>>({});

    const handleProgressUpdate = (lessonId: string, progress: number) => {
        setVideoProgress(prev => ({
            ...prev,
            [lessonId]: progress
        }));
    };

    return (
        <div className="w-full max-w-6xl mx-auto mt-0 mb-20 flex flex-col gap-4">
            {chapters.map((chapter, index) => {
                const isActive = chapter.id === currentChapterId;
                const completedCount = chapter.lessons.filter(l => masteredLessonIds.includes(l.id)).length;
                const totalCount = chapter.lessons.length;
                const chapterProgressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                const isCurrentLessonCompleted = currentLesson && masteredLessonIds.includes(currentLesson.id);

                const handleCompleteClick = () => {
                    onComplete();
                    if (currentLessonIndex < chapter.lessons.length - 1) {
                        onNext();
                    }
                };

                return (
                    <div
                        key={chapter.id}
                        className={`group w-full border rounded-[20px] transition-all duration-500 overflow-hidden ${isActive
                            ? 'bg-white border-stone-300/85 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'
                            : 'bg-[#E9E9E2]/60 border-stone-250/20 hover:bg-[#E9E9E2]/90 hover:border-stone-350/40'
                            }`}
                    >
                        {/* Header/Toggle part */}
                        <button
                            onClick={() => onChapterSelect(isActive ? "" : chapter.id)}
                            className="w-full p-6 text-left flex flex-col justify-center gap-2 relative cursor-pointer"
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-4">
                                    {/* Green Circular Progress */}
                                    <div className="relative w-8 h-8 flex items-center justify-center shrink-0 select-none">
                                        <svg className="w-8 h-8 transform -rotate-90">
                                            <circle
                                                cx="16"
                                                cy="16"
                                                r="13"
                                                stroke="#E4E4DF"
                                                strokeWidth="2.5"
                                                fill="transparent"
                                            />
                                            <circle
                                                cx="16"
                                                cy="16"
                                                r="13"
                                                stroke="#86BE7F"
                                                strokeWidth="2.5"
                                                fill="transparent"
                                                strokeDasharray={2 * Math.PI * 13}
                                                strokeDashoffset={2 * Math.PI * 13 - (chapterProgressPercent / 100) * (2 * Math.PI * 13)}
                                                strokeLinecap="round"
                                                className="transition-all duration-300"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-sans font-bold text-stone-800">
                                            {completedCount === totalCount && totalCount > 0 ? (
                                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24">
                                                    <path
                                                        d="M6 12l4 4l8-8"
                                                        stroke="#86BE7F"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            ) : (
                                                `${completedCount}/${totalCount}`
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <h3 className={`font-sans text-lg tracking-wide transition-colors duration-300 ${isActive ? 'text-stone-900 font-semibold' : 'text-stone-850 group-hover:text-stone-955'
                                            }`}>
                                            {chapter.title}
                                        </h3>
                                        <span className="text-[11px] text-stone-500 font-sans tracking-wide">
                                            {completedCount === totalCount ? "Completed" : "In Progress"}
                                        </span>
                                    </div>
                                </div>

                                <motion.div
                                    animate={{ rotate: isActive ? 180 : 0 }}
                                    className="text-stone-400"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </motion.div>
                            </div>
                        </button>

                        {/* Expandable Content */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                >
                                    <div className="border-t border-stone-200/60 p-8 flex flex-col gap-6">
                                        {/* Split Layout: Lessons List (Left 30%) and Video Player (Right 70%) */}
                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                            {/* Left Column: Lessons list stacked on top of each other (30% width) */}
                                            <div className="w-full md:w-[30%] flex flex-col gap-3 shrink-0">
                                                <span className="text-[10px] text-stone-500/80 uppercase tracking-widest font-sans font-bold">
                                                    Movement Lessons
                                                </span>
                                                <div className="flex flex-col gap-2 w-full select-none">
                                                    {chapter.lessons.map((lesson, idx) => {
                                                        const isLessonActive = currentLesson?.id === lesson.id;
                                                        const isMastered = masteredLessonIds.includes(lesson.id);
                                                        const lessonProgress = Math.max(
                                                            isMastered ? 100 : 0,
                                                            videoProgress[lesson.id] || 0
                                                        );

                                                        return (
                                                            <div
                                                                key={lesson.id}
                                                                onClick={() => onLessonSelect(idx)}
                                                                className={`flex items-center justify-between p-3 border rounded-[12px] transition-all group/lesson cursor-pointer ${isLessonActive
                                                                    ? 'bg-[#EFF0E7] border-stone-400 text-stone-900 shadow-sm'
                                                                    : 'bg-white/40 border-stone-200/80 hover:bg-[#EFF0E7]/50 hover:border-stone-300 text-stone-600'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3.5 w-full min-w-0">
                                                                    {/* Small Sage Green Circular Progress for each step */}
                                                                    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                                                                        <svg className="w-6 h-6 transform -rotate-90">
                                                                            <circle
                                                                                cx="12"
                                                                                cy="12"
                                                                                r="9.5"
                                                                                stroke="#E4E4DF"
                                                                                strokeWidth="2"
                                                                                fill="transparent"
                                                                            />
                                                                            <circle
                                                                                cx="12"
                                                                                cy="12"
                                                                                r="9.5"
                                                                                stroke="#86BE7F"
                                                                                strokeWidth="2"
                                                                                fill="transparent"
                                                                                strokeDasharray={2 * Math.PI * 9.5}
                                                                                strokeDashoffset={2 * Math.PI * 9.5 - (lessonProgress / 100) * (2 * Math.PI * 9.5)}
                                                                                strokeLinecap="round"
                                                                                className="transition-all duration-300"
                                                                            />
                                                                        </svg>
                                                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-sans font-bold text-stone-850">
                                                                            {isMastered ? (
                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                                                                    <path
                                                                                        d="M6 12l4 4l8-8"
                                                                                        stroke="#86BE7F"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                    />
                                                                                </svg>
                                                                            ) : (
                                                                                idx + 1
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className={`text-xs font-semibold truncate ${isLessonActive ? 'text-stone-900 font-bold' : 'text-stone-750/90 group-hover/lesson:text-stone-950'}`}>
                                                                            {lesson.title}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Right Column: Maximized Video Player (70% width) */}
                                            <div className="w-full md:w-[70%] relative">
                                                {currentLesson && chapter.lessons.some(l => l.id === currentLesson.id) ? (
                                                    <LessonContent
                                                        lesson={{
                                                            id: currentLesson.id,
                                                            title: currentLesson.title,
                                                            videoUrl: currentLesson.videoUrl,
                                                        }}
                                                        isActive={isActive}
                                                        onProgressUpdate={(progress) => handleProgressUpdate(currentLesson.id, progress)}
                                                        onVideoEnd={onNext}
                                                    />
                                                ) : (
                                                    <div className="aspect-video w-full flex items-center justify-center border border-stone-200 rounded-[20px] bg-white/40">
                                                        <p className="text-stone-700 font-sans text-sm font-medium">Select a lesson to view content</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Navigation and Completion Buttons at the very bottom (below the split layout) */}
                                        {currentLesson && chapter.lessons.some(l => l.id === currentLesson.id) && (
                                            <div className="flex items-center justify-between border-t border-stone-200/60 pt-6 mt-2">
                                                <div className="flex items-center gap-8">
                                                    <button
                                                        onClick={onBack}
                                                        disabled={currentLessonIndex === 0}
                                                        className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 font-semibold cursor-pointer active:scale-95"
                                                    >
                                                        Back
                                                    </button>
                                                    <span className="text-[10px] text-stone-400 font-sans tracking-widest font-medium">
                                                        {currentLessonIndex + 1}/{chapter.lessons.length}
                                                    </span>
                                                    <button
                                                        onClick={onNext}
                                                        disabled={currentLessonIndex === chapter.lessons.length - 1}
                                                        className="flex items-center gap-2 group text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 font-semibold cursor-pointer active:scale-95"
                                                    >
                                                        Next
                                                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {!isCurrentLessonCompleted ? (
                                                    <button
                                                        onClick={handleCompleteClick}
                                                        className="px-4 py-2 bg-[#86BE7F] hover:bg-[#86BE7F]/90 text-stone-955 font-bold rounded-full flex items-center gap-1.5 transition-all shadow-sm text-[10px] uppercase tracking-wider cursor-pointer active:scale-95"
                                                    >
                                                        Check
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12l4 4l8-8" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    currentLessonIndex === chapter.lessons.length - 1 && index < chapters.length - 1 && (
                                                        <button
                                                            onClick={onNextChapter}
                                                            className="px-5 py-2 bg-[#86BE7F] hover:bg-[#86BE7F]/90 text-stone-955 font-bold rounded-full flex items-center gap-1.5 transition-all shadow-md text-[10px] uppercase tracking-wider cursor-pointer active:scale-95 animate-pulse"
                                                        >
                                                            Complete & Go to Next Chapter
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
