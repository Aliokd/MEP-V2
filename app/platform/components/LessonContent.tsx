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
        <div className={`w-full flex flex-col gap-6 ${minimal ? '' : 'max-w-4xl mx-auto p-10 bg-white/40 border border-stone-200/80 rounded-[20px] relative overflow-hidden'}`}>

            {/* Video Player */}
            <div className="aspect-video w-full bg-stone-100 border border-stone-200/60 rounded-[14px] flex items-center justify-center overflow-hidden transition-all duration-500">
                {lesson.videoUrl ? (
                    <video
                        key={lesson.videoUrl}
                        src={lesson.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster="/assets/images/video-poster.jpg"
                    >
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div className="w-16 h-16 rounded-full border border-stone-300 flex items-center justify-center group-hover:scale-110 group-hover:border-stone-500 transition-all duration-300">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-stone-700 ml-1" />
                    </div>
                )}
            </div>

            {/* Text Content */}
            {!minimal && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-stone-700/80 leading-relaxed font-sans max-w-2xl font-medium">
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
                        className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 font-semibold"
                    >
                        Back
                    </button>
                    <span className="text-[10px] text-stone-400 font-sans tracking-widest font-medium">
                        {currentStep}/{totalSteps}
                    </span>
                    <button
                        onClick={onNext}
                        disabled={currentStep === totalSteps}
                        className="flex items-center gap-2 group text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 font-semibold"
                    >
                        Next
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                </div>

                {!isCompleted && (
                    <button
                        onClick={onComplete}
                        className="px-4 py-2 bg-[#86BE7F] hover:bg-[#86BE7F]/90 text-stone-950 font-bold rounded-full flex items-center gap-1.5 transition-all shadow-sm text-[10px] uppercase tracking-wider"
                    >
                        Check
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
