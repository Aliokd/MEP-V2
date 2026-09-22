"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import VideoStage from './VideoStage';

/**
 * A lesson's video. The frame, the poster-first sequence and the play overlay
 * are VideoStage, shared with Mind Power's Stay ahead sessions; what is here
 * is the part that belongs to Learn: the lesson's own progress reporting, and
 * starting the next lesson's video when Next moves to it.
 */

interface LessonContentProps {
    lesson: {
        id: string;
        title: string;
        videoUrl: string;
        posterUrl?: string;
    };
    isActive?: boolean;
    onProgressUpdate?: (progress: number) => void;
    onVideoEnd?: () => void;
}

export default function LessonContent({
    lesson,
    isActive = true,
    onProgressUpdate,
    onVideoEnd,
}: LessonContentProps) {
    const { t } = useLanguage();

    return (
        <VideoStage
            src={lesson.videoUrl}
            poster={lesson.posterUrl}
            tone="paper"
            active={isActive}
            autoPlayOnChange
            onProgressUpdate={onProgressUpdate}
            onEnded={onVideoEnd}
            fallbackText={t('learn.video_not_supported')}
            className="shadow-xs"
            placeholder={
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-stone-300 transition-all duration-300 group-hover/video:scale-110 group-hover/video:border-stone-500">
                    <div className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-stone-700" />
                </div>
            }
        />
    );
}
