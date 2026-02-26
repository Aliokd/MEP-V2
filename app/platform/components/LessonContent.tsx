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
    minimal?: boolean;
}

export default function LessonContent({
    lesson,
    currentStep,
    totalSteps,
    isCompleted,
    onBack,
    onNext,
    onComplete,
    minimal = false,
}: LessonContentProps) {
    return (
        <div className={`w-full flex flex-col gap-6 ${minimal ? '' : 'max-w-4xl mx-auto p-10 bg-white/[0.02] border border-white/[0.05] rounded-xs backdrop-blur-sm relative overflow-hidden'}`}>

            {/* Video Player */}
            <div className="aspect-video w-full bg-charcoal/50 border border-white/10 rounded-xs flex items-center justify-center overflow-hidden transition-all duration-500">
                {lesson.videoUrl ? (
                    <video
                        key={lesson.videoUrl}
                        src={lesson.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster="/assets/images/video-poster.jpg" // Added optional poster placeholder
                    >
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:border-gold-500/50 transition-all duration-300">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white/80 border-b-[10px] border-b-transparent ml-1" />
                    </div>
                )}
            </div>

            {/* Text Content */}
            {!minimal && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-alabaster/60 leading-relaxed font-sans max-w-2xl">
                        {lesson.description || "Focus on the technique and intention behind this movement."}
                    </p>
                </div>
            )}

            {/* Navigation and Completion */}
            <div className={`flex items-center justify-between mt-4 ${minimal ? 'px-6 pb-8' : ''}`}>
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
    );
}
