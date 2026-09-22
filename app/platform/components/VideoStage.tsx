"use client";

import React from 'react';

/**
 * The video frame used everywhere in the platform: Learn's lessons and Mind
 * Power's Stay ahead sessions.
 *
 * What makes a video feel fast is almost never the decoder. It is this
 * sequence: the poster paints first, a skeleton holds the space until the
 * poster is whole so a half-painted JPEG is never shown, one obvious play
 * control sits over it, and the file itself is only fetched for the video the
 * person is actually looking at. Learn has done this since it shipped; Stay
 * ahead was a bare `<video controls preload="none">`, which showed a black
 * box and then stalled on the first click.
 *
 * `active` is the lever that matters on a page holding several videos. The
 * active one preloads in full, so pressing play starts immediately; the rest
 * fetch metadata only. The Stay ahead sheet stacks a whole sequence in one
 * column, and without this every session in it began downloading at once.
 */

export type VideoTone = 'paper' | 'dark';

const TONE = {
    paper: {
        frame: 'bg-stone-100 border-stone-200/60',
        radius: 'rounded-[14px]',
        overlay: 'bg-stone-900/10 hover:bg-stone-900/25',
        ring: 'border-white/60 bg-white/10 group-hover/video:border-white group-hover/video:bg-white/20',
        arrow: 'border-l-white',
    },
    dark: {
        frame: 'bg-[#1B1B1B] border-white/10',
        radius: 'rounded-[18px]',
        overlay: 'bg-black/20 hover:bg-black/35',
        ring: 'border-white/50 bg-white/10 group-hover/video:border-white group-hover/video:bg-white/20',
        arrow: 'border-l-white',
    },
} as const;

interface VideoStageProps {
    src: string;
    poster?: string;
    tone?: VideoTone;
    /**
     * The one the person is looking at. Only this one is preloaded; it is also
     * the only one that may autoplay, and it pauses when it stops being active.
     */
    active?: boolean;
    /** Start playing when `src` changes while active — Learn's Next button. */
    autoPlayOnChange?: boolean;
    onProgressUpdate?: (percent: number) => void;
    onEnded?: () => void;
    /** Shown inside the frame when there is no video. */
    placeholder?: React.ReactNode;
    fallbackText?: string;
    className?: string;
}

export default function VideoStage({
    src,
    poster,
    tone = 'paper',
    active = true,
    autoPlayOnChange = false,
    onProgressUpdate,
    onEnded,
    placeholder,
    fallbackText,
    className = '',
}: VideoStageProps) {
    const c = TONE[tone];
    // Playback has begun: the custom overlay covers the poster state only, so
    // the native controls (scrubbing, volume, fullscreen) stay reachable after.
    const [hasStarted, setHasStarted] = React.useState(false);
    // Nothing real to show yet. The wait is almost entirely the poster
    // downloading, and a large JPEG paints progressively, so without this the
    // frame shows a strip of image over a void.
    const [ready, setReady] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const firstRender = React.useRef(true);

    React.useEffect(() => {
        setHasStarted(false);
        setReady(false);
    }, [src]);

    // Poster readiness is watched on a detached Image: the video element fires
    // no event for "poster finished downloading". The browser fetches the URL
    // once, so this costs no second download, and a broken poster counts as
    // ready rather than leaving a skeleton that never lifts.
    React.useEffect(() => {
        if (!poster) return;
        let cancelled = false;
        const img = new Image();
        img.onload = () => { if (!cancelled) setReady(true); };
        img.onerror = () => { if (!cancelled) setReady(true); };
        img.src = poster;
        if (img.complete) setReady(true);
        return () => { cancelled = true; };
    }, [src, poster]);

    React.useEffect(() => {
        if (!active && videoRef.current) videoRef.current.pause();
    }, [active]);

    React.useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if (!autoPlayOnChange || !active || !videoRef.current) return;
        videoRef.current.play().then(() => setHasStarted(true)).catch(() => {
            // Autoplay refused: the overlay is still there to press.
        });
    }, [src, active, autoPlayOnChange]);

    const play = () => {
        videoRef.current?.play().then(() => setHasStarted(true)).catch(err => {
            console.error('Video play error:', err);
        });
    };

    return (
        <div
            data-video-stage
            data-active={active || undefined}
            className={`group/video relative flex aspect-video w-full items-center justify-center overflow-hidden border transition-all duration-500 ${c.frame} ${c.radius} ${className}`}
        >
            {src ? (
                <video
                    ref={videoRef}
                    key={src}
                    src={src}
                    playsInline
                    // Native controls only once it is running: while the poster is
                    // up the overlay below is the play button, and `controls` there
                    // puts a second one in the bar and, on Android Chrome, a third
                    // over the poster.
                    controls={hasStarted}
                    // The one being looked at is worth having ready; the rest cost
                    // a metadata request each instead of a whole file.
                    preload={active ? 'auto' : 'metadata'}
                    poster={poster}
                    className={`h-full w-full object-cover transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
                    onTimeUpdate={e => {
                        const video = e.currentTarget;
                        if (video.duration) onProgressUpdate?.((video.currentTime / video.duration) * 100);
                    }}
                    onPlay={() => setHasStarted(true)}
                    /* Covers a video with no poster, and one already cached. */
                    onLoadedData={() => setReady(true)}
                    onEnded={onEnded}
                >
                    {fallbackText}
                </video>
            ) : (
                placeholder
            )}

            {src && !ready && <div className="absolute inset-0 skeleton-sweep" />}

            {/* The poster state's one control. Gated on `ready`, since a play
                button over a skeleton invites watching something not there yet. */}
            {src && ready && !hasStarted && (
                <button
                    type="button"
                    onClick={play}
                    aria-label={fallbackText}
                    className={`absolute inset-0 z-10 flex cursor-pointer items-center justify-center backdrop-blur-xs transition-all duration-300 ${c.overlay}`}
                >
                    <span
                        className={`flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-350 group-hover/video:scale-110 active:scale-95 ${c.ring}`}
                    >
                        <span className={`ml-1.5 h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent ${c.arrow}`} />
                    </span>
                </button>
            )}
        </div>
    );
}
