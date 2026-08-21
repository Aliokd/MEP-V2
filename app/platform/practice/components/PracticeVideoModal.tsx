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
    /**
     * Hand playback to the platform's own player on a phone.
     *
     * The custom chrome here — tap-the-frame to toggle, a hand-rolled scrub bar,
     * an overlay that hides itself on `playing` — assumes a pointer and a video
     * that is ready the moment it is asked. On mobile neither holds: the tap
     * toggles before the file has buffered, `play()` rejects, and because the
     * rejection was swallowed the overlay just sat there looking inert. The
     * native control set handles buffering, gestures and fullscreen properly.
     *
     * Safe to read matchMedia in the initializer: this component is only ever
     * mounted from a click, so it never renders on the server.
     */
    const [useNativeControls] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Opening the modal is already a play intent, so start straight away. Browsers
    // block unmuted autoplay in some contexts — the overlay stays up if they do.
    useEffect(() => {
        // Logged, not swallowed: a rejected play() was the difference between "the
        // video is broken" and a one-line reason, and there was no way to tell which.
        videoRef.current?.play().catch(err => {
            console.warn('Practice video autoplay declined:', err?.name || err);
        });
    }, []);

    const togglePlay = () => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
            el.play().catch(err => console.warn('Practice video play failed:', err?.name || err));
        } else {
            el.pause();
        }
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
                // Full bleed on a phone — the 80vw cap and the 1rem inset either side
                // left a clip noticeably smaller than the card that launched it. dvh,
                // not vh, in the desktop ratio: 100vh overshoots the visible height on
                // mobile browsers, which is what sized this too small in the first place.
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 animate-in fade-in duration-300 w-full max-w-full px-0 md:w-[min(80vw,calc((100dvh-140px)*1.7778))] md:max-w-[calc(100vw-2rem)]"
            >
                {/* Fixed-ratio crop box: the <video> paints its own black wherever its
                    box and the frame disagree by a hair, so cover-fit crops that sliver. */}
                <div className="relative w-full aspect-video overflow-hidden rounded-none md:rounded-[18px] bg-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.30)]">
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        controls={useNativeControls}
                        // object-contain with the native player: `cover` crops the frame,
                        // and on a full-bleed phone video that crop can take the control
                        // bar's own corner with it.
                        className={`w-full h-full block cursor-pointer ${useNativeControls ? 'object-contain bg-black' : 'object-cover'}`}
                        onClick={useNativeControls ? undefined : togglePlay}
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

                    {/* Custom overlay and scrub bar are the desktop chrome only — with
                        native controls up they would be a second play button over a
                        second progress bar. */}
                    {!useNativeControls && !isPlaying && (
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
                        className={`absolute left-4 right-4 bottom-3.5 h-4 items-center cursor-pointer group/bar ${useNativeControls ? 'hidden' : 'flex'}`}
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
