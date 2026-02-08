"use client";

import React from 'react';

interface ChapterProgressProps {
    chapters: { id: string; title: string }[];
    currentChapterId: string;
    overallProgress: number; // 0 to 100
    onChapterSelect: (id: string) => void;
}

export default function ChapterProgress({
    chapters,
    currentChapterId,
    overallProgress,
    onChapterSelect,
}: ChapterProgressProps) {
    return (
        <div className="w-full flex flex-col items-center pt-8 pb-4">
            {/* Overall Course Progress Bar */}
            <div className="w-full max-w-2xl h-1 bg-white/10 rounded-full mb-8 relative overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gold-500 transition-all duration-500 ease-out"
                    style={{ width: `${overallProgress}%` }}
                />
            </div>

            {/* Chapter Selection */}
            <div className="flex flex-col items-center">
                <div className="relative mb-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-sans opacity-80">
                        Chapter
                    </span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-gold-500/50" />
                </div>

                <div className="flex items-center gap-4">
                    {chapters.map((chapter, index) => {
                        const isActive = chapter.id === currentChapterId;
                        return (
                            <React.Fragment key={chapter.id}>
                                <button
                                    onClick={() => onChapterSelect(chapter.id)}
                                    className={`group relative flex flex-col items-center transition-all duration-300`}
                                >
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive
                                                ? 'bg-gold-500 scale-125 shadow-[0_0_10px_rgba(197,160,89,0.5)]'
                                                : 'bg-white/20 hover:bg-white/40'
                                            }`}
                                    />
                                    {isActive && (
                                        <div className="absolute -bottom-6 whitespace-nowrap text-[10px] text-alabaster/60 font-serif italic">
                                            {chapter.title}
                                        </div>
                                    )}
                                </button>
                                {index < chapters.length - 1 && (
                                    <div className="w-8 h-[1px] bg-white/5" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
