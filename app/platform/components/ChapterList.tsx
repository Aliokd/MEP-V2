"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Chapter {
    id: string;
    title: string;
    description?: string;
    lessons: { id: string; title: string }[];
}

interface ChapterListProps {
    chapters: Chapter[];
    currentChapterId: string;
    onChapterSelect: (id: string) => void;
}

export default function ChapterList({
    chapters,
    currentChapterId,
    onChapterSelect,
}: ChapterListProps) {
    return (
        <div className="w-full max-w-4xl mx-auto mt-12 mb-20 flex flex-col gap-4">
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
                                    <div className="px-6 pb-8 border-t border-white/[0.05] pt-6 flex flex-col gap-6">
                                        <p className="text-sm text-white/40 leading-relaxed max-w-2xl">
                                            {chapter.description || "Explore the fundamental principles of this movement. Delve into the intricate details and master the techniques required for progression."}
                                        </p>

                                        <div className="flex flex-col gap-3">
                                            <span className="text-[10px] text-white/20 uppercase tracking-widest">Lessons</span>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {chapter.lessons.length > 0 ? (
                                                    chapter.lessons.map((lesson, idx) => (
                                                        <div
                                                            key={lesson.id}
                                                            className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xs hover:border-gold-500/20 transition-colors group/lesson cursor-pointer"
                                                        >
                                                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] text-white/40 group-hover/lesson:border-gold-500/40 group-hover/lesson:text-gold-500 transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-xs text-white/60 group-hover/lesson:text-white transition-colors">
                                                                {lesson.title}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-white/20 italic">No lessons available for this movement.</span>
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
