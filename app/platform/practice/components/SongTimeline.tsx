"use client";

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { AuthoredSection } from '../data/practiceSongs';
import { ARMED_LINE, KIND_BG, KIND_LABEL_KEY, SECTION_TEXT, SOLVED_BG, SOLVED_TEXT, formatTime, sectionOrdinals, type SectionKind } from '../data/sections';

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
     * Start time of the one segment armed for the identify exercise. Held as a
     * start rather than a kind so arming "Verse 2" lights that band alone,
     * instead of every verse in the song at once.
     */
    selectedStart?: number | null;
    onSelectSegment?: (start: number, kind: SectionKind) => void;
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
    authored,
    duration,
    currentTime,
    isPlaying,
    onTogglePlay,
    onSeek,
    onScrub,
    selectedStart = null,
    onSelectSegment,
    solvedStarts,
}: SongTimelineProps) {
    const { t } = useLanguage();
    const trackRef = useRef<HTMLDivElement>(null);

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
            {/* Song pill left, colour key right */}
            <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="min-w-0">{heading}</div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {legendKinds.map(kind => (
                        <span key={kind} className="flex items-center gap-2 text-xs font-sans" style={{ color: SECTION_TEXT }}>
                            <span
                                className="w-2.5 h-2.5 rounded-full border border-stone-300/60"
                                style={{ backgroundColor: KIND_BG[kind] }}
                            />
                            {t(KIND_LABEL_KEY[kind])}
                        </span>
                    ))}
                </div>
            </div>

            <div className="w-full flex items-start gap-4">
                {/* Play / pause */}
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

                <div className="flex-1 min-w-0">
                    {/* Section bar — also the palette of answers while identifying */}
                    <div className="relative w-full h-11 overflow-hidden flex bg-stone-100">
                        {segments.map((segment, i) => {
                            const widthPct = ((segment.end - segment.start) / total) * 100;
                            const kindLabel = t(KIND_LABEL_KEY[segment.kind]);
                            const label = segment.ordinal ? `${kindLabel} ${segment.ordinal}` : kindLabel;
                            const pickable = !!onSelectSegment;
                            const isArmed = pickable && selectedStart === segment.start;
                            const isSolved = !!solvedStarts?.includes(segment.start);

                            return (
                                <button
                                    key={`${segment.kind}-${segment.start}`}
                                    type="button"
                                    disabled={!pickable}
                                    onClick={() => onSelectSegment?.(segment.start, segment.kind)}
                                    title={`${label} · ${formatTime(segment.start)}`}
                                    style={{
                                        width: `${widthPct}%`,
                                        backgroundColor: isSolved ? SOLVED_BG : KIND_BG[segment.kind],
                                        color: isSolved ? SOLVED_TEXT : SECTION_TEXT,
                                        ...(isArmed ? { boxShadow: `inset 0 0 0 2px ${ARMED_LINE}` } : {}),
                                    }}
                                    className={`relative h-full flex items-center justify-center overflow-hidden transition-all
                                        ${pickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}
                                    `}
                                >
                                    {widthPct > 7 && (
                                        <span className="px-1 text-xs font-sans truncate pointer-events-none">
                                            {label}
                                        </span>
                                    )}
                                    {/* Hairline between neighbours, drawn inside so the bar keeps its radius */}
                                    {i > 0 && <span className="absolute left-0 inset-y-0 w-px bg-white/60" />}
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
        </section>
    );
}
