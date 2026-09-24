"use client";

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { GOLDEN } from '../content';

/**
 * The product film, on a page that has so far only shown pieces of it.
 *
 * Nothing from YouTube loads until it is pressed. What sits in the frame
 * before that is ours: a five-second loop cut from the film, silent, served
 * from /public, so the thumbnail moves and invites the press without pulling
 * in a third-party player nobody asked for. The player, its scripts and its
 * cookies arrive on the click that asks for them.
 *
 * `youtube-nocookie` for the same reason, and because it is the host the CSP
 * already allows (proxy.ts, frame-src); the lesson embeds got there first.
 */

const VIDEO_ID = GOLDEN.videoId;

/**
 * The loop and its first frame, cut from the film already cropped to the
 * picture (no letterbox), 720p, H.264 with faststart. Null until the clip
 * exists: the frame then falls back to YouTube's own still.
 */
const LOOP: { src: string; poster: string } | null = null;

/**
 * The film is letterboxed at the source: 1280x653 of picture sitting inside a
 * 16:9 frame, with 33px of black above it and 34px below.
 *
 * Before the press, the frame is cut to the picture's own shape, so the still
 * or the loop shows no bars. Once playing it is the full 16:9 of the stream:
 * YouTube lays its title bar and its controls over the whole frame, edge to
 * edge, and cropping the bars away cropped those with them. The bars show
 * while it plays, under the controls, which is what they are there for.
 */
const PICTURE = '1280 / 653';
const PLAYER = '16 / 9';

export default function ActionVideo() {
    const [playing, setPlaying] = useState(false);

    return (
        // No border and no dark ground: either one showed as a black hairline
        // where the rounded corner antialiases against the picture. The ground
        // is the page's own paper, so whatever peeks through reads as nothing.
        //
        // Playing, the corners tighten and the ground turns black: YouTube's
        // buttons sit a few pixels from the frame's edge, and a 16px corner
        // clipped the ones in the corners. Black is the colour of the film's
        // own bars, so the edge disappears into them.
        <div
            style={{ aspectRatio: playing ? PLAYER : PICTURE }}
            className={`relative w-full overflow-hidden ${playing ? 'rounded-md bg-black' : 'rounded-2xl bg-[#DCD9D0]'}`}
        >
            {playing ? (
                <iframe
                    // autoplay is honest here: the frame only exists because
                    // somebody pressed play, so it starts what they asked for
                    // rather than making them press a second time.
                    src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                    title={GOLDEN.videoTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={GOLDEN.videoPlay}
                    className="group absolute inset-0 h-full w-full cursor-pointer"
                >
                    {LOOP ? <Loop src={LOOP.src} poster={LOOP.poster} /> : <Still />}
                    <span className="absolute inset-0 bg-stone-950/10 transition-colors group-hover:bg-stone-950/20" />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-transform group-hover:scale-105 md:h-20 md:w-20">
                            {/* Nudged right: a triangle centred on its bounding
                                box reads as sitting left of centre in a circle. */}
                            <Play className="ml-1 h-7 w-7 text-stone-900 md:h-8 md:w-8" fill="currentColor" strokeWidth={0} />
                        </span>
                    </span>
                </button>
            )}
        </div>
    );
}

/**
 * YouTube's own still, until the loop exists. It carries the same letterbox
 * bars as the film; `cover` on a box cut to the picture's shape crops them,
 * and the slight overscale takes the half-pixel sliver that rounding leaves.
 */
function Still() {
    return (
        <img
            src={`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full scale-[1.015] object-cover"
        />
    );
}

/**
 * The five seconds, looping, silent.
 *
 * Fetched only once the frame is near the screen: the section sits far down
 * a long page, and most visits never reach it. Someone who asked for less
 * motion gets the first frame and nothing that moves.
 */
function Loop({ src, poster }: { src: string; poster: string }) {
    const ref = useRef<HTMLVideoElement>(null);
    const [near, setNear] = useState(false);
    const reduce = useReducedMotion() ?? false;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setNear(true);
                    if (!reduce) void el.play().catch(() => { /* autoplay refused; the poster stands */ });
                } else {
                    // Off screen it stops, so a tab left open is not decoding
                    // a video nobody is looking at.
                    el.pause();
                }
            },
            { rootMargin: '400px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [reduce]);

    return (
        <video
            ref={ref}
            src={near && !reduce ? src : undefined}
            poster={poster}
            autoPlay={!reduce}
            muted
            loop
            playsInline
            preload={near ? 'auto' : 'none'}
            aria-hidden="true"
            tabIndex={-1}
            className="h-full w-full object-cover"
        />
    );
}
