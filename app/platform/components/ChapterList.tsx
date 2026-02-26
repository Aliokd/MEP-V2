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

                return (
                    <div
                        key={chapter.id}
                        className={`group w-full border rounded-xs transition-all duration-500 overflow-hidden ${isActive
                            ? 'bg-white/[0.05] border-white/20'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/10'
                            }`}
                    >
                        {/* Header/Toggle part */}
                        <button
                            onClick={() => onChapterSelect(isActive ? "" : chapter.id)}
                            className="w-full p-6 text-left flex flex-col justify-center gap-2 relative"
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-gold-500/50 font-sans tracking-[0.2em] uppercase">
                                        Movement 0{index + 1}
                                    </span>
                                    <h3 className={`font-serif text-xl tracking-wide transition-colors duration-300 ${isActive ? 'text-gold-400' : 'text-alabaster/60 group-hover:text-alabaster'
                                        }`}>
                                        {chapter.title}
                                    </h3>
                                </div>

                                <motion.div
                                    animate={{ rotate: isActive ? 180 : 0 }}
                                    className="text-gold-500/40"
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
                                    <div className="border-t border-white/[0.05]">
                                        {/* Toggle Bar */}
                                        <div className="px-6 py-4 flex justify-between items-center bg-white/[0.02]">
                                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-sans">
                                                {isMinimized ? "Video Focus Mode" : "Lesson Details"}
                                            </p>
                                            <button
                                                onClick={() => setIsMinimized(!isMinimized)}
                                                className="text-[10px] text-gold-500/60 hover:text-gold-400 uppercase tracking-widest font-sans flex items-center gap-2 transition-colors"
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
                                                    <p className="text-sm text-white/40 leading-relaxed max-w-2xl">
                                                        {chapter.description || "Explore the fundamental principles of this movement. Delve into the intricate details and master the techniques required for progression."}
                                                    </p>

                                                    <div className="flex flex-col gap-3">
                                                        <span className="text-[10px] text-white/20 uppercase tracking-widest font-sans">Lessons</span>
                                                        <div className="flex flex-col gap-2">
                                                            {chapter.lessons.length > 0 ? (
                                                                chapter.lessons.map((lesson, idx) => {
                                                                    const isLessonActive = currentLesson?.id === lesson.id;
                                                                    const isMastered = masteredLessonIds.includes(lesson.id);

                                                                    return (
                                                                        <div
                                                                            key={lesson.id}
                                                                            onClick={() => onLessonSelect(idx)}
                                                                            className={`flex items-center justify-between p-3 border rounded-xs transition-all group/lesson cursor-pointer ${isLessonActive
                                                                                ? 'bg-gold-500/10 border-gold-500/30'
                                                                                : 'bg-white/[0.02] border-white/[0.05] hover:border-white/20'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-colors ${isLessonActive
                                                                                    ? 'border-gold-500 text-gold-500'
                                                                                    : isMastered ? 'border-green-500/50 text-green-500/50' : 'border-white/10 text-white/40 group-hover/lesson:border-gold-500/40 group-hover/lesson:text-gold-500'
                                                                                    }`}>
                                                                                    {isMastered ? '✓' : idx + 1}
                                                                                </div>
                                                                                <span className={`text-xs transition-colors ${isLessonActive ? 'text-gold-400' : 'text-white/60 group-hover/lesson:text-white'}`}>
                                                                                    {lesson.title}
                                                                                </span>
                                                                            </div>
                                                                            {isLessonActive && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-white/20 italic">No lessons available for this movement.</span>
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
                                                    <div className="h-full min-h-[400px] flex items-center justify-center border border-white/[0.05] rounded-xs bg-white/[0.01]">
                                                        <p className="text-white/20 font-serif text-sm italic">Select a lesson to view content</p>
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
