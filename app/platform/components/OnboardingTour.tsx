"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Play } from 'lucide-react';

export interface TourStep {
    /** CSS selector for the element to spotlight. Omit for a centered step (e.g. the intro video). */
    target?: string;
    /** Video source. When set, the step renders as a bare centered video instead of a spotlight. */
    video?: string;
    /** Poster frame for a video step — avoids a blank box before the first frame decodes. */
    poster?: string;
    /** Spotlight steps only — the intro video step renders no copy. */
    title?: string;
    description?: string;
}

interface OnboardingTourProps {
    steps: TourStep[];
    /** Called when the tour is completed, skipped, or closed — parent persists the "seen" flag. */
    onFinish: () => void;
    skipLabel: string;
    backLabel: string;
    nextLabel: string;
    doneLabel: string;
    closeLabel: string;
    /** Dismiss label on the intro video step, e.g. "Close demo". */
    closeDemoLabel: string;
    /**
     * Replay from settings: the user already pressed "Play demo", so the intro
     * video opens centered and playing rather than in the pristine docked state
     * a first-time user clicks into.
     */
    autoPlayVideo?: boolean;
}

interface Rect { top: number; left: number; width: number; height: number; }

// Some tour targets exist twice in the DOM at once (e.g. a mobile-only and a
// desktop-only copy of the same pill, toggled with responsive classes), and
// off-canvas elements like the mobile sidebar drawer stay mounted but sit
// outside the viewport. Only the one actually on screen should be spotlighted.
function findVisibleElement(selector: string): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) continue;
        return el;
    }
    return null;
}

export default function OnboardingTour({ steps, onFinish, skipLabel, backLabel, nextLabel, doneLabel, closeLabel, closeDemoLabel, autoPlayVideo = false }: OnboardingTourProps) {
    const [mounted, setMounted] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // Once playback has begun the video stays centered/large even while paused —
    // only the pristine "haven't pressed play yet" state docks it small in the corner.
    // A replay skips that state: the "Play demo" click was the play intent.
    const [hasStarted, setHasStarted] = useState(autoPlayVideo);
    const [progress, setProgress] = useState(0);
    const attemptsRef = useRef(0);
    const cancelledRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => setMounted(true), []);

    const step = steps[stepIndex];
    // The parent rebuilds `steps` (and every step object) on each of its own renders, so
    // the effects below key off these primitives rather than the object identity —
    // otherwise they'd see a "new" step every render and never stop resetting.
    const target = step?.target;
    const video = step?.video;

    const measure = useCallback(() => {
        if (!target) return;
        const el = findVisibleElement(target);
        if (el) {
            const r = el.getBoundingClientRect();
            // Clamp to the viewport: big targets (the lyric canvas) extend past the fold,
            // and an unclamped rect would push the tooltip off-screen — the user would
            // have to scroll to find the explainer. Spotlight the visible part instead.
            const top = Math.max(r.top, 0);
            const left = Math.max(r.left, 0);
            const bottom = Math.min(r.bottom, window.innerHeight);
            const right = Math.min(r.right, window.innerWidth);
            if (bottom <= top || right <= left) return;
            setRect({ top, left, width: right - left, height: bottom - top });
        }
    }, [target]);

    // Find (and keep retrying for) this step's target. Real app content mounts
    // async — e.g. the create canvas auto-creates a note on first load — so the
    // element may not exist yet when the step becomes active.
    useEffect(() => {
        if (!target) { setRect(null); return; }
        cancelledRef.current = false;
        attemptsRef.current = 0;
        setRect(null);

        const tryFind = () => {
            if (cancelledRef.current) return;
            const el = findVisibleElement(target);
            if (el) {
                // Only scroll small targets that are partly off-screen into view.
                // Tall targets (the canvas) get their visible part spotlighted where
                // the page already is — scrolling mid-tour disorients more than it helps.
                const r = el.getBoundingClientRect();
                const fullyVisible = r.top >= 0 && r.bottom <= window.innerHeight;
                const tallTarget = r.height > window.innerHeight * 0.7;
                if (!fullyVisible && !tallTarget) {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
                measure();
            } else if (attemptsRef.current < 15) {
                attemptsRef.current += 1;
                setTimeout(tryFind, 200);
            } else if (!cancelledRef.current) {
                // Never showed up (e.g. this device layout hides it) — don't stall the tour.
                setStepIndex(i => (i < steps.length - 1 ? i + 1 : i));
            }
        };
        tryFind();

        return () => { cancelledRef.current = true; };
    }, [target, measure, steps.length]);

    useEffect(() => {
        if (!rect) return;
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [rect, measure]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFinish(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onFinish]);

    // Leaving a video step should stop playback rather than let audio run under the
    // tour. Moving between two video steps also lands here: the progress bar and the
    // play/pause overlay describe whichever clip is on screen, so they reset with it.
    useEffect(() => {
        if (!video && videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
        setProgress(0);
    }, [video]);

    // Replay: open the intro centered and start it. `autoPlayVideo` can arrive a
    // render late — the parent only learns it's a replay once the guide is
    // eligible — so this reacts to the flip rather than trusting the value that
    // was present at mount.
    //
    // The click that asked for this happened on the previous route, so the browser
    // may still refuse an unmuted autoplay. That's survivable: the card is already
    // centered and large with its play button showing, which is the state this is
    // really here to produce.
    useEffect(() => {
        if (!autoPlayVideo || !video) return;
        setHasStarted(true);
        videoRef.current?.play().catch(() => { /* user presses play instead */ });
    }, [autoPlayVideo, video]);

    // Below `md` the 70% maths would *shrink* the card below its resting size, so
    // narrow screens keep the near-full-width treatment instead. Listening to `resize`
    // as well as the media query: the mq `change` event alone is unreliable under
    // devtools/CDP viewport emulation, which resizes without always firing it.
    const [isWideViewport, setIsWideViewport] = useState(true);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const apply = () => setIsWideViewport(mq.matches);
        apply();
        mq.addEventListener('change', apply);
        window.addEventListener('resize', apply);
        return () => {
            mq.removeEventListener('change', apply);
            window.removeEventListener('resize', apply);
        };
    }, []);

    if (!mounted || !step) return null;
    // A spotlight step isn't renderable until its target has been located and measured.
    if (!video && !rect) return null;

    const isLast = stepIndex === steps.length - 1;
    const goNext = () => (isLast ? onFinish() : setStepIndex(i => i + 1));
    const goBack = () => setStepIndex(i => Math.max(0, i - 1));

    const togglePlay = () => {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
            el.play().then(() => {
                setIsPlaying(true);
                setHasStarted(true);
            }).catch(err => console.warn('[Guide] video play failed:', err));
        } else {
            el.pause();
            setIsPlaying(false);
        }
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const el = videoRef.current;
        if (!el || !el.duration) return;
        const bar = e.currentTarget.getBoundingClientRect();
        el.currentTime = ((e.clientX - bar.left) / bar.width) * el.duration;
    };

    // Shared chrome so the video card and the spotlight tooltip stay visually identical.
    const controls = (
        <>
            <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === stepIndex ? 'w-6 bg-stone-900' : 'w-1.5 bg-stone-200'
                        }`}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-1.5 pr-4">
                <h3 className="text-lg font-sans font-semibold text-stone-900 leading-snug">{step.title}</h3>
                <p className="text-[14px] font-medium text-stone-600 leading-relaxed">{step.description}</p>
            </div>

            <div className="flex items-center justify-between gap-3 mt-1">
                <button
                    onClick={onFinish}
                    className="text-[13px] font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                >
                    {skipLabel}
                </button>
                <div className="flex items-center gap-2">
                    {stepIndex > 0 && (
                        <button
                            onClick={goBack}
                            className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-white border border-stone-200/70 text-[13px] font-semibold text-stone-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                        >
                            <ChevronLeft size={14} />
                            {backLabel}
                        </button>
                    )}
                    <button
                        onClick={goNext}
                        className="flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-[13px] font-semibold text-stone-900 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] transition-all cursor-pointer active:scale-95"
                    >
                        {isLast ? doneLabel : nextLabel}
                        {!isLast && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </>
    );

    const closeButton = (
        <button
            onClick={onFinish}
            aria-label={closeLabel}
            className="absolute top-4 right-4 z-10 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
            <X size={16} />
        </button>
    );

    /*
     * Width of the bare video on the intro step. Playing grows it to ~70% of the screen;
     * the second term reserves room for the button row beneath and converts the leftover
     * height back into a width (x 16/9), so the whole thing still fits on short screens.
     * Below `md` that maths would *shrink* it, so narrow screens go near-full-width.
     */
    /*
     * Pristine (never played): a small player docked in the bottom-right corner.
     * After the first play it moves to the center at ~70% of the screen; the second
     * min() term reserves room for the button row and converts the leftover height
     * back into a width (x 16/9) so the whole thing fits on short screens. Both
     * states are inline styles: arbitrary Tailwind classes with min()/calc() never
     * get emitted by the JIT scanner and would sit inert in the DOM.
     */
    const videoWrapStyle: React.CSSProperties = hasStarted
        ? {
            right: '50%',
            bottom: '50%',
            transform: 'translate(50%, 50%)',
            width: isWideViewport ? 'min(70vw, calc((100vh - 140px) * 1.7778))' : 'calc(100vw - 2rem)',
            maxWidth: 'calc(100vw - 2rem)',
        }
        : {
            right: 24,
            bottom: 24,
            width: 'min(320px, calc(100vw - 48px))',
        };

    // ── Intro video step: just the video on a lightly blurred backdrop. No card,
    //    no copy, no native control bar — click the frame to play/pause, slim
    //    progress bar in the player, buttons below.
    if (video) {
        return createPortal(
            <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[5px]" onClick={onFinish} />

                <div
                    onClick={(e) => e.stopPropagation()}
                    className="fixed flex flex-col items-center gap-4 animate-in fade-in duration-300 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={videoWrapStyle}
                >
                    {/* Strict 16:9 crop box: the <video> element paints its own background
                        black wherever its box and the frame disagree by a hair (metadata
                        still loading, subpixel rounding) — cover-fit inside a fixed-ratio
                        container crops that sliver instead of showing it. */}
                    <div className="relative w-full aspect-video overflow-hidden rounded-[18px] bg-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.30)]">
                        <video
                            // Keyed so each clip gets its own element: without this React
                            // reuses the node across consecutive video steps and swaps
                            // `src`, which keeps the previous clip's buffered state.
                            key={video}
                            ref={videoRef}
                            src={video}
                            poster={step.poster}
                            className="w-full h-full block object-cover cursor-pointer"
                            onClick={togglePlay}
                            onPlay={() => { setIsPlaying(true); setHasStarted(true); }}
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
                                <div className={`rounded-full bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center justify-center group-hover:scale-105 transition-all ${
                                    hasStarted ? 'w-[84px] h-[84px]' : 'w-14 h-14'
                                }`}>
                                    <Play className={`fill-stone-900 text-stone-900 stroke-none ml-1 ${hasStarted ? 'w-9 h-9' : 'w-6 h-6'}`} />
                                </div>
                            </div>
                        )}
                        {/* Slim seek/progress bar — the only chrome on the player */}
                        {hasStarted && (
                            <div
                                onClick={seekTo}
                                className="absolute left-4 right-4 bottom-3.5 h-4 flex items-center cursor-pointer group/bar"
                            >
                                <div className="w-full h-1.5 rounded-full bg-white/30 overflow-hidden group-hover/bar:h-2 transition-all">
                                    <div
                                        className="h-full rounded-full bg-white/95"
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dismiss on the left, forward action on the right */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onFinish}
                            className="px-5 py-2.5 rounded-full bg-stone-900/50 backdrop-blur-sm text-[13px] font-semibold text-white hover:bg-stone-900/65 transition-all cursor-pointer active:scale-95"
                        >
                            {closeDemoLabel}
                        </button>
                        <button
                            onClick={goNext}
                            className="flex items-center gap-1 px-5 py-2.5 rounded-full bg-white text-[13px] font-semibold text-stone-900 shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all cursor-pointer active:scale-95"
                        >
                            {nextLabel}
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ── Spotlight step ──────────────────────────────────────────────────────────
    const spot = {
        top: rect!.top - 8,
        left: rect!.left - 8,
        width: rect!.width + 16,
        height: rect!.height + 16,
    };
    const radius = Math.min(24, Math.min(spot.width, spot.height) / 2);

    const tooltipWidth = 320;
    const margin = 16;
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    const placeAbove = spaceBelow < 240 && spot.top > 240;
    // A viewport-sized spot (the clamped lyric canvas) leaves no room above or
    // below — float the tooltip over the spot instead of pushing it off-screen.
    const overlaySpot = spaceBelow < 240 && spot.top <= 240;
    const tooltipTop = overlaySpot
        ? Math.max(margin, Math.min(spot.top + spot.height / 2 - 110, window.innerHeight - 260))
        : placeAbove ? undefined : spot.top + spot.height + margin;
    const tooltipBottom = !overlaySpot && placeAbove ? window.innerHeight - spot.top + margin : undefined;
    const rawLeft = spot.left + spot.width / 2 - tooltipWidth / 2;
    const tooltipLeft = Math.min(Math.max(margin, rawLeft), window.innerWidth - tooltipWidth - margin);

    // Everything EXCEPT the spotlighted section gets blurred. A single full-screen
    // overlay with an SVG alpha mask punching a rounded-rect hole — tiling separate
    // panels around the hole instead leaves visible seam lines where their edges
    // meet (each panel blurs its backdrop independently) and can't round the corners.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hw = spot.width - 2 * radius;
    const hh = spot.height - 2 * radius;
    const holePath =
        `M${spot.left + radius},${spot.top} h${hw} ` +
        `a${radius},${radius} 0 0 1 ${radius},${radius} v${hh} ` +
        `a${radius},${radius} 0 0 1 -${radius},${radius} h-${hw} ` +
        `a${radius},${radius} 0 0 1 -${radius},-${radius} v-${hh} ` +
        `a${radius},${radius} 0 0 1 ${radius},-${radius} z`;
    const maskSvg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${vw}' height='${vh}'>` +
        `<path fill-rule='evenodd' d='M0,0 h${vw} v${vh} h-${vw} z ${holePath}' fill='black'/></svg>`;
    const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`;
    const maskStyle: React.CSSProperties = {
        maskImage: maskUrl,
        WebkitMaskImage: maskUrl,
        maskSize: `${vw}px ${vh}px`,
        WebkitMaskSize: `${vw}px ${vh}px`,
    };

    return createPortal(
        <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
            {/* Click-catcher: keeps the rest of the app inert while the tour is active */}
            <div className="fixed inset-0" onClick={onFinish} />

            {/* Blur everything around the spotlighted section */}
            <div
                className="fixed inset-0 pointer-events-none bg-stone-950/25 backdrop-blur-[5px]"
                style={maskStyle}
            />
            <div
                className="fixed pointer-events-none transition-all duration-300 ease-out border-2 border-white/90"
                style={{
                    top: spot.top,
                    left: spot.left,
                    width: spot.width,
                    height: spot.height,
                    borderRadius: radius,
                }}
            />

            {/* Tooltip card */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-stone-200/70 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: tooltipTop,
                    bottom: tooltipBottom,
                    left: tooltipLeft,
                    width: tooltipWidth,
                    maxWidth: `calc(100vw - ${margin * 2}px)`,
                }}
            >
                {closeButton}
                {controls}
            </div>
        </div>,
        document.body
    );
}
