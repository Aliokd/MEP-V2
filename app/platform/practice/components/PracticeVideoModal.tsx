"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';

interface PracticeVideoModalProps {
    src: string;
    poster?: string;
    title: string;
    onClose: () => void;
}

/**
 * The practice intro clip, played the same way as the onboarding demo video:
 * a bare 16:9 player on a blurred backdrop, click the frame to play/pause, no
 * native control bar — just a slim progress bar.
 */
export default function PracticeVideoModal({ src, poster, title, onClose }: PracticeVideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Opening the modal is already a play intent, so start straight away. Browsers
    // block unmuted autoplay in some contexts — the overlay stays up if they do.
    useEffect(() => {
        videoRef.current?.play().catch(() => { /* user taps the overlay instead */ });
    }, []);

    const togglePlay = () => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = videoRef.current;
        if (!el || !el.duration) return;
        const bar = e.currentTarget.getBoundingClientRect();
        el.currentTime = ((e.clientX - bar.left) / bar.width) * el.duration;
    };

    // Only ever mounted from a click, so there is no server pass to guard against
    // beyond this — createPortal needs a real document.
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px]" onClick={onClose} />

            <button
                onClick={onClose}
                aria-label="Close video"
                className="fixed top-6 right-6 w-10 h-10 rounded-full bg-white/85 hover:bg-white flex items-center justify-center text-stone-800 transition-colors active:scale-95 z-10"
            >
                <X size={20} className="stroke-[1.8]" />
            </button>

            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 animate-in fade-in duration-300 w-[min(80vw,calc((100vh-140px)*1.7778))] max-w-[calc(100vw-2rem)]"
            >
                {/* Fixed-ratio crop box: the <video> paints its own black wherever its
                    box and the frame disagree by a hair, so cover-fit crops that sliver. */}
                <div className="relative w-full aspect-video overflow-hidden rounded-[18px] bg-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.30)]">
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        className="w-full h-full block object-cover cursor-pointer"
                        onClick={togglePlay}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={(e) => {
                            const el = e.currentTarget;
                            setProgress(el.duration ? el.currentTime / el.duration : 0);
                        }}
                        playsInline
                        preload="auto"
                    />

                    {!isPlaying && (
                        <div
                            onClick={togglePlay}
                            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                        >
                            <div className="w-[84px] h-[84px] rounded-full bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Play className="w-9 h-9 fill-stone-900 text-stone-900 stroke-none ml-1" />
                            </div>
                        </div>
                    )}

                    <div
                        onClick={seekTo}
                        className="absolute left-4 right-4 bottom-3.5 h-4 flex items-center cursor-pointer group/bar"
                    >
                        <div className="w-full h-1.5 rounded-full bg-white/30 overflow-hidden group-hover/bar:h-2 transition-all">
                            <div className="h-full rounded-full bg-white/95" style={{ width: `${progress * 100}%` }} />
                        </div>
                    </div>
                </div>

                <p className="text-white/90 text-sm font-sans">{title}</p>
            </div>
        </div>,
        document.body
    );
}
