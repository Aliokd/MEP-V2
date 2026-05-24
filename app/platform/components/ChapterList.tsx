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
}: ChapterListProps) {
    const [isMinimized, setIsMinimized] = React.useState(false);

    return (
        <div className="w-full max-w-6xl mx-auto mt-12 mb-20 flex flex-col gap-4">
            {chapters.map((chapter, index) => {
                const isActive = chapter.id === currentChapterId;
                const completedCount = chapter.lessons.filter(l => masteredLessonIds.includes(l.id)).length;
                const totalCount = chapter.lessons.length;

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
                            className="w-full p-6 text-left flex flex-col justify-center gap-2 relative"
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col gap-0.5">
                                    <h3 className={`font-sans text-lg tracking-wide transition-colors duration-300 ${isActive ? 'text-stone-900 font-semibold' : 'text-stone-850 group-hover:text-stone-950'
                                        }`}>
                                        {chapter.title}
                                    </h3>
                                    <span className="text-[11px] text-stone-500 font-sans tracking-wide">
                                        Progress: {completedCount}/{totalCount} lessons
                                    </span>
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
                                    <div className="border-t border-stone-200/60">
                                        {/* Toggle Bar */}
                                        <div className="px-6 py-4 flex justify-between items-center bg-stone-50/50">
                                            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-sans font-medium">
                                                {isMinimized ? "Video Focus Mode" : "Lesson Details"}
                                            </p>
                                            <button
                                                onClick={() => setIsMinimized(!isMinimized)}
                                                className="text-[10px] text-stone-600 hover:text-stone-950 uppercase tracking-widest font-sans flex items-center gap-2 transition-colors font-semibold"
                                            >
                                                {isMinimized ? (
                                                    <>Show Lessons <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg></>
                                                ) : (
                                                    <>Maximize Video <svg className="w-3 h-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg></>
                                                )}
                                            </button>
                                        </div>

                                        <div className={`transition-all duration-500 flex flex-col md:flex-row ${isMinimized ? 'gap-0' : 'gap-8 p-6'}`}>
                                            {!isMinimized && (
                                                <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-left duration-500">
                                                    <p className="text-sm text-stone-700/80 font-medium leading-relaxed max-w-2xl font-sans">
                                                        {chapter.description || "Explore the fundamental principles of this movement. Delve into the intricate details and master the techniques required for progression."}
                                                    </p>

                                                    <div className="flex flex-col gap-3">
                                                        <span className="text-[10px] text-stone-500/80 uppercase tracking-widest font-sans font-semibold">Lessons</span>
                                                        <div className="flex flex-col gap-2">
                                                            {chapter.lessons.length > 0 ? (
                                                                chapter.lessons.map((lesson, idx) => {
                                                                    const isLessonActive = currentLesson?.id === lesson.id;
                                                                    const isMastered = masteredLessonIds.includes(lesson.id);

                                                                    return (
                                                                        <div
                                                                            key={lesson.id}
                                                                            onClick={() => onLessonSelect(idx)}
                                                                            className={`flex items-center justify-between p-3 border rounded-[12px] transition-all group/lesson cursor-pointer ${isLessonActive
                                                                                ? 'bg-[#EFF0E7] border-stone-400 text-stone-900 shadow-sm'
                                                                                : 'bg-white/40 border-stone-200/80 hover:bg-[#EFF0E7]/50 hover:border-stone-300 text-stone-600'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-colors ${isLessonActive
                                                                                    ? 'border-stone-900 text-stone-900 font-semibold'
                                                                                    : isMastered ? 'border-[#86BE7F]/60 text-[#86BE7F] bg-[#86BE7F]/10' : 'border-stone-200 text-stone-400 group-hover/lesson:border-stone-400 group-hover/lesson:text-stone-700'
                                                                                    }`}>
                                                                                    {isMastered ? '✓' : idx + 1}
                                                                                </div>
                                                                                <span className={`text-xs transition-colors ${isLessonActive ? 'text-stone-900 font-semibold' : 'text-stone-700/80 group-hover/lesson:text-stone-950'}`}>
                                                                                    {lesson.title}
                                                                                </span>
                                                                            </div>
                                                                            {isLessonActive && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-stone-900 animate-pulse" />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-stone-400 italic">No lessons available for this movement.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Video Player Section inside Chapter */}
                                            <div className={`transition-all duration-500 ${isMinimized ? 'w-full' : 'flex-1'}`}>
                                                {currentLesson && chapter.lessons.some(l => l.id === currentLesson.id) ? (
                                                    <div className={isMinimized ? "" : ""}>
                                                        <LessonContent
                                                            lesson={{
                                                                id: currentLesson.id,
                                                                title: currentLesson.title,
                                                                videoUrl: currentLesson.videoUrl,
                                                                description: "Focus on the technique and intention behind this movement."
                                                            }}
                                                            currentStep={currentLessonIndex + 1}
                                                            totalSteps={chapter.lessons.length}
                                                            isCompleted={masteredLessonIds.includes(currentLesson.id)}
                                                            onBack={onBack}
                                                            onNext={onNext}
                                                            onComplete={onComplete}
                                                            minimal={isMinimized}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-full min-h-[400px] flex items-center justify-center border border-stone-200 rounded-[20px] bg-white/40">
                                                        <p className="text-stone-700 font-sans text-sm font-medium">Select a lesson to view content</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
