"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

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
    // Tracks whether playback has ever started for this lesson — the custom
    // play overlay only covers the initial poster state, not every pause, so
    // native controls (scrubbing, volume, fullscreen) stay reachable once started.
    const [hasStarted, setHasStarted] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const isInitialMount = React.useRef(true);

    // Reset to the poster state whenever the lesson changes
    React.useEffect(() => {
        setHasStarted(false);
    }, [lesson.id]);

    // Pause video immediately when chapter is collapsed/inactive
    React.useEffect(() => {
        if (!isActive && videoRef.current) {
            videoRef.current.pause();
        }
    }, [isActive]);

    // Autoplay when lesson ID changes (e.g. Next / Back / clicking a lesson card)
    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (isActive && videoRef.current) {
            videoRef.current.play().then(() => {
                setHasStarted(true);
            }).catch(err => {
                console.log("Autoplay prevented:", err);
            });
        }
    }, [lesson.id, isActive]);

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.duration) {
            const progress = (video.currentTime / video.duration) * 100;
            onProgressUpdate?.(progress);
        }
    };

    const handlePlayOverlayClick = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setHasStarted(true);
            }).catch(err => {
                console.error("Video play error:", err);
            });
        }
    };

    return (
        <div className="w-full relative aspect-video bg-stone-100 border border-stone-200/60 rounded-[14px] flex items-center justify-center overflow-hidden transition-all duration-500 group/video shadow-xs">
            {lesson.videoUrl ? (
                <video
                    ref={videoRef}
                    key={lesson.videoUrl}
                    src={lesson.videoUrl}
                    controls
                    preload="auto"
                    poster={lesson.posterUrl}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setHasStarted(true)}
                    onEnded={onVideoEnd}
                >
                    {t('learn.video_not_supported')}
                </video>
            ) : (
                <div className="w-16 h-16 rounded-full border border-stone-300 flex items-center justify-center group-hover/video:scale-110 group-hover/video:border-stone-500 transition-all duration-300">
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-stone-700 ml-1" />
                </div>
            )}

            {/* Custom Minimalist Play Overlay — poster state only, doesn't reappear on pause */}
            {lesson.videoUrl && !hasStarted && (
                <div 
                    onClick={handlePlayOverlayClick}
                    className="absolute inset-0 bg-stone-900/10 backdrop-blur-xs flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-stone-900/25 z-10"
                >
                    <div className="w-16 h-16 rounded-full border border-white/60 bg-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-350 group-hover/video:scale-110 group-hover/video:border-white group-hover/video:bg-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95">
                        <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[15px] border-l-white ml-1.5" />
                    </div>
                </div>
            )}
        </div>
    );
}
