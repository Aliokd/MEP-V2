"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Music4 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { AuthoredSection } from '../data/practiceSongs';
import Confetti from '@/app/onboarding/components/Confetti';
import { KIND_BG, KIND_LABEL_KEY, SECTION_TEXT, SOLVED_TEXT, formatTime, sectionOrdinals, solvedFill, type SectionKind } from '../data/sections';

interface Segment {
    kind: SectionKind;
    start: number;
    end: number;
    /** Which occurrence of its kind this is, or null when the kind is unique. */
    ordinal: number | null;
}

interface SongTimelineProps {
    /** Rendered above the bar, opposite the legend — typically the song pill. */
    heading?: ReactNode;
    /** Far right of the heading row, where the legend sits when there is one. */
    trailing?: ReactNode;
    /** The song's structure — authored by hand or by the analyser. */
    authored: AuthoredSection[];
    /** Audio duration; falls back to the last lyric timestamp when the file hasn't loaded. */
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    /**
     * Fired continuously while the marker is dragged, so whatever follows the
     * playhead stays with it during the scrub. `null` means the drag was
     * cancelled without committing a seek.
     */
    onScrub?: (time: number | null) => void;
    /**
     * Task mode. The bands go nameless so the structure has to be heard rather
     * than read, and the legend goes with them — a colour key would give back
     * exactly what hiding the labels takes away. Solved bands are named again,
     * as the reward for placing them.
     */
    hideLabels?: boolean;
    /** Start time of the section the user is being asked to find. */
    targetStart?: number | null;
    /** The ask itself, e.g. "Find Verse 2" — drawn pointing at the target band. */
    promptLabel?: string | null;
    /** Fires the burst over the ask, marking the answer just given. */
    celebrate?: boolean;
    /** Clicking a band moves the playhead there, so the part can be heard. */
    onSeekToSegment?: (start: number) => void;
    /**
     * Start times of the sections already named, matched by start rather than
     * index so a re-sort here can never light up the wrong band.
     */
    solvedStarts?: number[];
}

/**
 * The song's structure drawn as a bar, and the player itself. Scrubbing lives on
 * the line beneath the bar — dragging the marker there — which leaves the bar free
 * to double as the palette of section types for the identify exercise.
 */
export default function SongTimeline({
    heading,
    trailing,
    authored,
    duration,
    currentTime,
    isPlaying,
    onTogglePlay,
    onSeek,
    onScrub,
    hideLabels = false,
    targetStart = null,
    promptLabel = null,
    celebrate = false,
    onSeekToSegment,
    solvedStarts,
}: SongTimelineProps) {
    const { t } = useLanguage();
    const trackRef = useRef<HTMLDivElement>(null);
    const promptRowRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLSpanElement>(null);
    /** Bubble offset and, within it, where the tail sits — both in px. */
    const [prompt, setPrompt] = useState<{ left: number; tail: number } | null>(null);
    /**
     * The pulse is there to be found. Once the user has clicked the band they
     * have found it, so it settles — a marker that keeps moving after you have
     * acknowledged it is just noise. Reset whenever a new section is asked for.
     */
    const [pulseSettled, setPulseSettled] = useState(false);
    useEffect(() => { setPulseSettled(false); }, [targetStart]);

    // While scrubbing, the marker follows the pointer, not the audio.
    const [dragTime, setDragTime] = useState<number | null>(null);

    const { segments, total } = useMemo(() => {
        const spans = [...authored].sort((a, b) => a.start - b.start);
        if (spans.length === 0) return { segments: [] as Segment[], total: 0 };
        const lastEnd = spans[spans.length - 1].end;
        const ordinals = sectionOrdinals(spans.map(s => s.kind));
        /*
         * A still-streaming file reports Infinity for its duration. Left in, it
         * becomes the denominator of the playhead and pins the marker at zero
         * while the clock keeps counting — so fall back to the structure's own
         * end, which is always finite.
         */
        const measured = Number.isFinite(duration) && duration > 0 ? duration : 0;
        return {
            segments: spans.map((s, i) => ({ kind: s.kind, start: s.start, end: s.end, ordinal: ordinals[i] })),
            total: Math.max(measured, lastEnd),
        };
    }, [authored, duration]);

    // Mid-point of the band being asked for, so the prompt can point at it.
    const targetSeg = targetStart === null ? undefined : segments.find(s => s.start === targetStart);
    const targetPct = targetSeg && total > 0
        ? ((targetSeg.start + targetSeg.end) / 2 / total) * 100
        : null;

    /*
     * Place the bubble and its tail. The tail wants the band's centre; the bubble
     * wants to stay on screen. Measured rather than done in CSS because it needs
     * the rendered pill width, which changes with the wording and the language.
     */
    useLayoutEffect(() => {
        const row = promptRowRef.current;
        const pill = pillRef.current;
        if (!row || !pill || targetPct === null) { setPrompt(null); return; }

        const place = () => {
            const rowW = row.offsetWidth;
            const pillW = pill.offsetWidth;
            if (!rowW || !pillW) return;
            const centre = (targetPct / 100) * rowW;
            const left = Math.max(0, Math.min(rowW - pillW, centre - pillW / 2));
            setPrompt({ left, tail: centre - left });
        };
        place();

        const ro = new ResizeObserver(place);
        ro.observe(row);
        ro.observe(pill);
        return () => ro.disconnect();
    }, [targetPct, promptLabel]);

    if (segments.length === 0 || total <= 0) return null;

    const displayTime = dragTime ?? currentTime;
    const playheadPct = Math.max(0, Math.min(100, (displayTime / total) * 100));

    const timeFromPointer = (clientX: number) => {
        const track = trackRef.current;
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio * total;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const time = timeFromPointer(e.clientX);
        setDragTime(time);
        onScrub?.(time);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragTime === null) return;
        const time = timeFromPointer(e.clientX);
        setDragTime(time);
        // Reported live so the lyrics follow the marker mid-drag, not on release
        onScrub?.(time);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragTime === null) return;
        onSeek(timeFromPointer(e.clientX));
        setDragTime(null);
    };

    const handlePointerCancel = () => {
        setDragTime(null);
        onScrub?.(null);
    };

    // Legend covers the kinds actually on this song, in the order they first appear.
    const legendKinds = segments.reduce<SectionKind[]>((acc, s) => {
        if (!acc.includes(s.kind)) acc.push(s.kind);
        return acc;
    }, []);

    return (
        <section data-song-timeline className="w-full max-w-6xl mx-auto flex flex-col gap-3 select-none">
            {/* Song pill and transport left, colour key right. The play button sits
                up here rather than beside the bar so the bar gets the full width. */}
            <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="w-11 h-11 shrink-0 rounded-full bg-white hover:bg-stone-50 text-stone-900 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                        {/*
                         * Both glyphs are drawn to the edges of their viewBox, so the
                         * flex centring lands them dead centre — no optical nudge, which
                         * a triangle inset in a square box would otherwise need.
                         */}
                        {isPlaying ? (
                            <svg width="15" height="17" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
                                <rect x="0" y="0" width="5" height="18" rx="1" />
                                <rect x="11" y="0" width="5" height="18" rx="1" />
                            </svg>
                        ) : (
                            /*
                             * Corners softened by stroking the outline with a round join,
                             * the path inset by the stroke's half-width so the glyph keeps
                             * its size. Nudged a pixel right: a triangle's visual mass sits
                             * left of its bounding box, so true centring reads as too far left.
                             */
                            <svg
                                width="15" height="17" viewBox="0 0 16 18"
                                fill="currentColor" stroke="currentColor"
                                strokeWidth="3" strokeLinejoin="round"
                                className="translate-x-[1px]" aria-hidden="true"
                            >
                                <path d="M1.75 1.75 L14.25 9 L1.75 16.25 Z" />
                            </svg>
                        )}
                    </button>
                    <div className="min-w-0">{heading}</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {!hideLabels && legendKinds.map(kind => (
                        <span key={kind} className="flex items-center gap-2 text-xs font-sans" style={{ color: SECTION_TEXT }}>
                            <span
                                className="w-2.5 h-2.5 rounded-full border border-stone-300/60"
                                style={{ backgroundColor: KIND_BG[kind] }}
                            />
                            {t(KIND_LABEL_KEY[kind])}
                        </span>
                    ))}
                    {trailing}
                </div>
            </div>

            <div className="w-full">
                <div className="min-w-0">
                    {/*
                     * The ask, with its tail on the centre of the band it refers to.
                     * The bubble slides to stay inside the timeline while the tail
                     * holds its place, so a prompt on a 4%-wide intro still points at
                     * the intro instead of being nudged onto its neighbour.
                     */}
                    {promptLabel && (
                        <div ref={promptRowRef} className="relative h-10">
                            <div
                                className="absolute bottom-0 flex flex-col items-start"
                                style={{ left: prompt ? `${prompt.left}px` : '50%' }}
                            >
                                <span className="relative">
                                    {/*
                                     * The burst for a correct answer lands here rather
                                     * than on the card: the lyrics list is a scroll
                                     * region, and it clipped the paper at its edges.
                                     * Above the bubble, on the page's own background,
                                     * nothing crops it and the original palette reads.
                                     */}
                                    {celebrate && (
                                        <span className="pointer-events-none absolute inset-0 isolate z-20">
                                            <Confetti />
                                        </span>
                                    )}
                                    <span
                                        ref={pillRef}
                                        data-timeline-prompt
                                        className="relative block rounded-full bg-stone-900 text-[#FAF9F5] px-4 py-1.5 text-xs font-sans whitespace-nowrap shadow-sm"
                                    >
                                        {promptLabel}
                                    </span>
                                </span>
                                <svg
                                    width="13" height="7" viewBox="0 0 13 7" aria-hidden="true"
                                    className="-mt-px"
                                    style={{ marginLeft: prompt ? `${prompt.tail - 6.5}px` : 0 }}
                                >
                                    <path d="M6.5 7 L13 0 H0 Z" fill="#1C1917" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Section bar. overflow-visible so the target band can swell past
                        it; nothing else here escapes its bounds. */}
                    <div className="relative w-full h-11 overflow-visible flex bg-stone-100">
                        {segments.map((segment, i) => {
                            const widthPct = ((segment.end - segment.start) / total) * 100;
                            const kindLabel = t(KIND_LABEL_KEY[segment.kind]);
                            const label = segment.ordinal ? `${kindLabel} ${segment.ordinal}` : kindLabel;
                            const isSolved = !!solvedStarts?.includes(segment.start);
                            const isTarget = targetStart === segment.start;
                            // Named once solved, whatever the mode
                            const named = !hideLabels || isSolved;
                            /*
                             * While one band is being asked for, the unsolved rest stop
                             * responding — the black fill carries the focus, so they
                             * keep their colour. Named bands stay live: they are
                             * finished, not competing, and playing one back is how you
                             * re-read its lyrics.
                             */
                            const inactive = targetStart !== null && !isTarget && !isSolved;
                            const seekable = !!onSeekToSegment && !inactive;

                            return (
                                <button
                                    key={`${segment.kind}-${segment.start}`}
                                    type="button"
                                    data-band-start={segment.start}
                                    data-band-kind={segment.kind}
                                    data-band-target={isTarget ? '' : undefined}
                                    disabled={!seekable}
                                    onClick={() => {
                                        if (isTarget) setPulseSettled(true);
                                        onSeekToSegment?.(segment.start);
                                    }}
                                    // The time alone while nameless — a tooltip would
                                    // hand over the very answer the task is asking for.
                                    title={named ? `${label} · ${formatTime(segment.start)}` : formatTime(segment.start)}
                                    style={{
                                        width: `${widthPct}%`,
                                        /*
                                         * The band being asked for goes solid black — it is
                                         * never a named one, so no label is lost to it. The
                                         * moment its ask is answered it turns green with
                                         * everything else, rather than staying black through
                                         * the celebration.
                                         */
                                        backgroundColor: isTarget && !celebrate
                                            ? '#1C1917'
                                            : (isSolved || isTarget) ? solvedFill(segment.kind) : KIND_BG[segment.kind],
                                        color: (isSolved || (isTarget && celebrate)) ? SOLVED_TEXT : SECTION_TEXT,
                                    }}
                                    className={`band relative h-full flex items-center justify-center overflow-hidden transition-colors duration-200
                                        ${isTarget && !pulseSettled && !celebrate ? 'is-target z-10' : ''}
                                        ${seekable ? 'cursor-pointer' : 'cursor-default'}
                                    `}
                                >
                                    {/*
                                     * The intro takes the same music note the wordless
                                     * lyric card wears, small enough to fit a band far too
                                     * narrow for the word "Intro".
                                     */}
                                    {named && segment.kind === 'intro' ? (
                                        <Music4 className="w-3 h-3 stroke-[2] shrink-0 pointer-events-none" aria-hidden="true" />
                                    ) : named && widthPct > 7 && (
                                        <span className="px-1 text-xs font-sans font-medium truncate pointer-events-none">
                                            {label}
                                        </span>
                                    )}
                                    {/*
                                     * The gap between neighbours. Painted in the page's
                                     * own background rather than a translucent hairline,
                                     * so it reads as a real division between two beiges
                                     * a shade apart. Drawn inside the band so it cannot
                                     * change any band's width.
                                     */}
                                    {i > 0 && (
                                        <span className="absolute left-0 inset-y-0 w-[3px] bg-[#F0F0EA] pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}

                        {/*
                         * Playhead inside the bar, sharing one percentage with the
                         * marker below so the two always read as a single upright.
                         * Clipped by the bar's own radius; never eats a click.
                         */}
                        <div
                            aria-hidden="true"
                            className="absolute top-0 bottom-0 w-[2px] bg-stone-900 pointer-events-none"
                            style={{ left: `${playheadPct}%`, transform: 'translateX(-1px)' }}
                        />
                    </div>

                    {/* Scrub line: the marker rides it, elapsed time sits right below it */}
                    <div
                        ref={trackRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        className="relative w-full h-9 mt-1.5 cursor-pointer touch-none"
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-stone-200" />

                        <div
                            className="absolute top-0 flex flex-col items-center"
                            style={{ left: `${playheadPct}%`, transform: 'translateX(-50%)' }}
                        >
                            {/* Sits below the hairline, tip pointing up at it */}
                            <svg width="13" height="8" viewBox="0 0 13 8" className="mt-[3px]" aria-hidden="true">
                                <path d="M6.5 0 L13 8 H0 Z" fill="#1C1917" />
                            </svg>
                            <span className="mt-0.5 text-xs font-sans tabular-nums" style={{ color: SECTION_TEXT }}>
                                {formatTime(displayTime)}
                            </span>
                        </div>

                        {/* Song length, hidden once the marker gets close enough to collide */}
                        {playheadPct < 88 && (
                            <span className="absolute right-0 top-2 text-xs font-sans tabular-nums" style={{ color: SECTION_TEXT }}>
                                {formatTime(total)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                /*
                 * The band being asked for breathes between its own size and 120%.
                 * A transform, so the neighbours keep their places and only the
                 * target appears to lift off the bar.
                 */
                .band.is-target {
                    animation: band-pulse 1.6s ease-in-out infinite;
                }
                @keyframes band-pulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.2); }
                }

                /* Still findable without the motion: hold it at the larger size. */
                @media (prefers-reduced-motion: reduce) {
                    .band.is-target {
                        animation: none;
                        transform: scale(1.12);
                    }
                }
            `}</style>
        </section>
    );
}
