"use client";

import React from 'react';

interface LessonContentProps {
    lesson: {
        id: string;
        title: string;
        videoUrl: string;
        description?: string;
    };
    currentStep: number;
    totalSteps: number;
    isCompleted: boolean;
    onBack: () => void;
    onNext: () => void;
    onComplete: () => void;
}

export default function LessonContent({
    lesson,
    currentStep,
    totalSteps,
    isCompleted,
    onBack,
    onNext,
    onComplete,
}: LessonContentProps) {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-10 bg-white/[0.02] border border-white/[0.05] rounded-xs backdrop-blur-sm relative overflow-hidden">
            {/* Completion Status Banner */}
            {isCompleted && (
                <div className="absolute top-0 left-0 w-full bg-green-800/80 py-6 flex items-center justify-center border-b border-green-500/30 animate-in fade-in slide-in-from-top duration-500">
                    <span className="text-alabaster font-serif text-sm tracking-widest uppercase">
                        Chapter checked
                    </span>
                </div>
            )}

            {/* Video Player Placeholder */}
            <div className={`aspect-video w-full bg-charcoal/50 border border-white/10 rounded-xs flex items-center justify-center group cursor-pointer transition-all duration-500 ${isCompleted ? 'mt-14' : ''}`}>
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:border-gold-500/50 transition-all duration-300">
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white/80 border-b-[10px] border-b-transparent ml-1 group-hover:border-l-gold-500 transition-colors" />
                </div>
            </div>

            {/* Text Content */}
            <div className="flex flex-col gap-4">
                <p className="text-sm text-alabaster/60 leading-relaxed font-sans max-w-2xl">
                    {lesson.description || "This error means the automated process that tries to turn your code into a running website failed on Google's servers. Since you are using Vite (which creates a static frontend) but deployed to Firebase App Hosting (which is designed for dynamic servers like Next.js or Angular), there is likely a mismatch in how Firebase is trying to build your app."}
                </p>

                {/* Navigation and Completion */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={onBack}
                            disabled={currentStep === 1}
                            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-20"
                        >
                            Back
                        </button>
                        <span className="text-[10px] text-white/20 font-sans tracking-widest">
                            {currentStep}/{totalSteps}
                        </span>
                        <button
                            onClick={onNext}
                            disabled={currentStep === totalSteps}
                            className="flex items-center gap-2 group text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-20"
                        >
                            Next
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="ArrowRight" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    </div>

                    {!isCompleted && (
                        <button
                            onClick={onComplete}
                            className="group flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-gold-400 transition-all duration-300"
                        >
                            Check
                            <svg className="w-4 h-4 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
