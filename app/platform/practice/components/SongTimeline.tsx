"use client";

import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { LyricSection } from '../data/songs';
import { KIND_BG, KIND_LABEL_KEY, SECTION_TEXT, classifySection, formatTime, type SectionKind } from '../data/sections';

interface Segment {
    kind: SectionKind;
    start: number;
    end: number;
    /** True when the segment came from a lyric section rather than a gap we filled in. */
    fromLyrics: boolean;
}

/** Gaps shorter than this are absorbed rather than drawn — they're breaths, not sections. */
const MIN_GAP = 2;

interface SongTimelineProps {
    /** Shown above the bar — the song being worked on. */
    title: string;
    sections: LyricSection[];
    /** Audio duration; falls back to the last lyric timestamp when the file hasn't loaded. */
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    /** The section type currently armed for the identify exercise. */
    selectedKind?: SectionKind | null;
    /** Picking a segment arms its type; only segments backed by lyrics can be picked. */
    onSelectKind?: (kind: SectionKind) => void;
}

/**
 * The song's structure drawn as a bar, and the player itself. Scrubbing lives on
 * the line beneath the bar — dragging the marker there — which leaves the bar free
 * to double as the palette of section types for the identify exercise.
 */
export default function SongTimeline({
    title,
    sections,
    duration,
    currentTime,
    isPlaying,
    onTogglePlay,
    onSeek,
    selectedKind = null,
    onSelectKind,
}: SongTimelineProps) {
    const { t } = useLanguage();
    const trackRef = useRef<HTMLDivElement>(null);

    // While scrubbing, the marker follows the pointer, not the audio.
    const [dragTime, setDragTime] = useState<number | null>(null);

    const { segments, total } = useMemo(() => {
        const timed = sections
            .map((section) => {
                const words = section.lines.flatMap(l => l.words);
                if (words.length === 0) return null;
                return {
                    kind: classifySection(section.title),
                    start: Math.min(...words.map(w => w.start)),
                    end: Math.max(...words.map(w => w.end)),
                };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null)
            .sort((a, b) => a.start - b.start);

        if (timed.length === 0) return { segments: [] as Segment[], total: 0 };

        const lastEnd = timed[timed.length - 1].end;

        /*
         * Scale to the audio only when the lyrics actually reach the end of it.
         * Several sample songs are transcribed for their first minute only, and
         * stretching those across the full file leaves every section a sliver
         * beside one enormous "outro".
         */
        const useAudioLength = duration > 0 && lastEnd / duration >= 0.7;
        const total = useAudioLength ? duration : lastEnd;

        const out: Segment[] = [];

        // Lead-in before the first line is the intro, when there's enough of it.
        const lead = timed[0].start;
        if (lead >= MIN_GAP) out.push({ kind: 'intro', start: 0, end: lead, fromLyrics: false });

        timed.forEach((s, i) => {
            out.push({ kind: s.kind, start: s.start, end: s.end, fromLyrics: true });
            const next = timed[i + 1];
            if (next && next.start - s.end >= MIN_GAP) {
                out.push({ kind: 'other', start: s.end, end: next.start, fromLyrics: false });
            }
        });

        // Trailing music is the outro, unless the song already names one.
        const hasOutro = timed.some(s => s.kind === 'outro');
        if (useAudioLength && !hasOutro && total - lastEnd >= MIN_GAP) {
            out.push({ kind: 'outro', start: lastEnd, end: total, fromLyrics: false });
        }

        return { segments: out, total };
    }, [sections, duration]);

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
        setDragTime(timeFromPointer(e.clientX));
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragTime !== null) setDragTime(timeFromPointer(e.clientX));
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragTime === null) return;
        onSeek(timeFromPointer(e.clientX));
        setDragTime(null);
    };

    // Legend covers the kinds actually on this song, in the order they first appear.
    const legendKinds = segments.reduce<SectionKind[]>((acc, s) => {
        if (!acc.includes(s.kind)) acc.push(s.kind);
        return acc;
    }, []);

    return (
        <section data-song-timeline className="w-full max-w-6xl mx-auto flex flex-col gap-3 select-none">
            {/* Song name left, colour key right */}
            <div className="flex items-center justify-between gap-6 flex-wrap">
                <h3 className="text-sm font-sans" style={{ color: SECTION_TEXT }}>{title}</h3>
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
                    className="w-11 h-11 shrink-0 rounded-full bg-stone-900 hover:bg-stone-800 flex items-center justify-center text-[#FAF9F5] active:scale-95 transition-all cursor-pointer"
                >
                    {isPlaying ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    {/* Section bar — also the palette of answers while identifying */}
                    <div className="relative w-full h-11 rounded-[12px] overflow-hidden flex bg-stone-100">
                        {segments.map((segment, i) => {
                            const widthPct = ((segment.end - segment.start) / total) * 100;
                            const label = t(KIND_LABEL_KEY[segment.kind]);
                            const pickable = !!onSelectKind && segment.fromLyrics;
                            const isArmed = pickable && selectedKind === segment.kind;

                            return (
                                <button
                                    key={`${segment.kind}-${segment.start}`}
                                    type="button"
                                    disabled={!pickable}
                                    onClick={() => onSelectKind?.(segment.kind)}
                                    title={`${label} · ${formatTime(segment.start)}`}
                                    style={{ width: `${widthPct}%`, backgroundColor: KIND_BG[segment.kind], color: SECTION_TEXT }}
                                    className={`relative h-full flex items-center justify-center overflow-hidden transition-all
                                        ${pickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}
                                        ${isArmed ? 'ring-2 ring-inset ring-stone-900' : ''}
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
                    </div>

                    {/* Scrub line: the marker rides it, elapsed time sits right below it */}
                    <div
                        ref={trackRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={() => setDragTime(null)}
                        className="relative w-full h-9 mt-1.5 cursor-pointer touch-none"
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-stone-200" />

                        <div
                            className={`absolute top-0 flex flex-col items-center ${dragTime === null ? 'transition-[left] duration-100 ease-linear' : ''}`}
                            style={{ left: `${playheadPct}%`, transform: 'translateX(-50%)' }}
                        >
                            <svg width="13" height="8" viewBox="0 0 13 8" className="-mt-[7px]" aria-hidden="true">
                                <path d="M6.5 0 L13 8 H0 Z" fill="#1C1917" />
                            </svg>
                            <span className="mt-1 text-xs font-sans tabular-nums" style={{ color: SECTION_TEXT }}>
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
