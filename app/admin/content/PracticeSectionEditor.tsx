"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Play, Pause, CircleDot, AlertTriangle, Wand2 } from "lucide-react";
import { Badge, Button, Input, Panel, Select, Textarea } from "../components/ui";
import { AnalysisFailed, analyzeSongUrl } from "@/app/platform/practice/lib/analyzeSong";
import {
    SECTION_KINDS,
    SECTION_LABELS,
    emptySection,
    formatTime,
    parseTime,
    sortSections,
    validateSections,
    type CmsPracticeSection,
} from "@/lib/practiceLibrary";

/**
 * Maps out where each part of a recording begins and ends.
 *
 * Practice 1 plays a song and asks the songwriter to name the part they are
 * hearing, so the whole exercise rests on these timings being right. Typing
 * seconds into boxes while counting along to a separate player is how they end
 * up wrong, so the player is here: play the song, and mark the boundary you can
 * hear. Everything else — validation, ordering — follows from that.
 */
export default function PracticeSectionEditor({
    sections,
    audioUrl,
    durationSeconds,
    onChange,
    onDuration,
}: {
    sections: CmsPracticeSection[];
    audioUrl: string;
    durationSeconds?: number | null;
    onChange: (sections: CmsPracticeSection[]) => void;
    onDuration: (seconds: number) => void;
}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [playhead, setPlayhead] = useState(0);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisNote, setAnalysisNote] = useState<string | null>(null);

    /**
     * First pass by the same analyser the platform uses on member-uploaded
     * songs: FFT → timbre novelty → clustering. Boundaries land well; labels
     * are a good guess. It exists so mapping starts from something to correct
     * rather than an empty list — the ear, the player and the checks above are
     * still what make it accurate.
     */
    const analyze = async () => {
        if (sections.length > 0 &&
            !window.confirm("Replace the current sections with a fresh analysis of the audio?")) return;
        setAnalyzing(true);
        setAnalysisNote(null);
        try {
            const found = await analyzeSongUrl(audioUrl);
            onChange(sortSections(found.map((s) => ({
                kind: s.kind,
                start: Math.round(s.start * 10) / 10,
                end: Math.round(s.end * 10) / 10,
                lines: [],
            }))));
            setAnalysisNote(
                `Found ${found.length} sections. The boundaries are usually close and the labels are a guess — play through and correct before publishing.`,
            );
        } catch (err) {
            const reason = err instanceof AnalysisFailed ? err.reason : "decode";
            setAnalysisNote(
                reason === "fetch"
                    ? "Couldn't read the audio back from storage — try again in a moment."
                    : reason === "too-short"
                      ? "The recording is too short to decompose — map it by hand."
                      : "This recording resisted analysis — map it by hand with the player.",
            );
        } finally {
            setAnalyzing(false);
        }
    };

    // The list is held in playing order, so "the part before this one" is always
    // the row above and an editor never has to sort by hand.
    const ordered = sortSections(sections);
    const problems = validateSections(sections, durationSeconds);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => setPlayhead(audio.currentTime);
        const onEnd = () => setPlaying(false);
        const onMeta = () => {
            if (audio.duration && Number.isFinite(audio.duration)) onDuration(Math.round(audio.duration));
        };
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("ended", onEnd);
        audio.addEventListener("loadedmetadata", onMeta);
        return () => {
            audio.removeEventListener("timeupdate", onTime);
            audio.removeEventListener("ended", onEnd);
            audio.removeEventListener("loadedmetadata", onMeta);
        };
    }, [audioUrl, onDuration]);

    const toggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
    };

    const seek = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, seconds);
        setPlayhead(audio.currentTime);
    };

    const update = (index: number, patch: Partial<CmsPracticeSection>) => {
        const next = ordered.map((s, i) => (i === index ? { ...s, ...patch } : s));
        onChange(sortSections(next));
    };

    const remove = (index: number) => {
        if (!window.confirm("Remove this section?")) return;
        onChange(ordered.filter((_, i) => i !== index));
    };

    /** A new section starts where the last one ended — songs have no gaps by default. */
    const add = () => {
        const last = ordered[ordered.length - 1];
        onChange(sortSections([...ordered, emptySection(last ? last.end : 0)]));
    };

    /** Splits the song at the playhead: end the current part here, start the next. */
    const markHere = () => {
        const at = Math.round(playhead * 10) / 10;
        const containing = ordered.findIndex((s) => at > s.start && at < s.end);
        if (containing === -1) {
            onChange(sortSections([...ordered, { ...emptySection(at), end: at + 15 }]));
            return;
        }
        const current = ordered[containing];
        const next = [...ordered];
        next[containing] = { ...current, end: at };
        next.splice(containing + 1, 0, { ...emptySection(at), end: current.end, kind: "chorus" });
        onChange(sortSections(next));
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">Structure</span>
                <span className="text-[11px] text-ink-600">
                    {ordered.length} {ordered.length === 1 ? "section" : "sections"}
                    {durationSeconds ? ` · ${formatTime(durationSeconds)} long` : ""}
                </span>
            </div>

            {!audioUrl ? (
                <Panel className="p-4">
                    <p className="text-xs text-ink-500">
                        Upload the audio first. The timings are marked against the recording, so there is
                        nothing to map until it is here.
                    </p>
                </Panel>
            ) : (
                <>
                    <Panel className="p-4 flex flex-col gap-3">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- an editing scrubber, not content */}
                        <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggle}
                                className="w-9 h-9 rounded-full bg-ink-700 hover:bg-ink-600 text-ink-100 flex items-center justify-center transition-colors shrink-0"
                                title={playing ? "Pause" : "Play"}
                            >
                                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>

                            <span className="text-sm text-ink-100 tabular-nums w-24">
                                {formatTime(playhead)}
                                <span className="text-ink-600"> / {formatTime(durationSeconds || 0)}</span>
                            </span>

                            <input
                                type="range"
                                min={0}
                                max={durationSeconds || 0}
                                step={0.1}
                                value={playhead}
                                onChange={(e) => seek(Number(e.target.value))}
                                className="flex-1 accent-green-500"
                            />

                            <Button size="sm" onClick={markHere} title="Split the song at the playhead">
                                <CircleDot className="w-3.5 h-3.5" /> Mark here
                            </Button>

                            <Button
                                size="sm"
                                onClick={analyze}
                                disabled={analyzing}
                                title="Let the analyser propose the structure, then correct it by ear"
                            >
                                {analyzing ? <span className="animate-pulse">Listening…</span> : (
                                    <><Wand2 className="w-3.5 h-3.5" /> Analyze</>
                                )}
                            </Button>
                        </div>

                        {analysisNote && (
                            <p className="text-[11px] text-ink-400">{analysisNote}</p>
                        )}

                        {/* The structure as a strip, so a gap or an overlap is visible
                            rather than something to work out from two columns of numbers. */}
                        {durationSeconds ? (
                            <div className="relative h-7 rounded-lg bg-ink-850 overflow-hidden">
                                {ordered.map((section, i) => (
                                    <button
                                        key={i}
                                        onClick={() => seek(section.start)}
                                        title={`${SECTION_LABELS[section.kind]} · ${formatTime(section.start)}`}
                                        className="absolute top-0 h-full border-r border-ink-900 bg-ink-600 hover:bg-ink-500 transition-colors text-[10px] text-ink-100 overflow-hidden whitespace-nowrap px-1"
                                        style={{
                                            left: `${(section.start / durationSeconds) * 100}%`,
                                            width: `${((section.end - section.start) / durationSeconds) * 100}%`,
                                        }}
                                    >
                                        {SECTION_LABELS[section.kind]}
                                    </button>
                                ))}
                                <div
                                    className="absolute top-0 h-full w-0.5 bg-green-400 pointer-events-none"
                                    style={{ left: `${(playhead / durationSeconds) * 100}%` }}
                                />
                            </div>
                        ) : null}
                    </Panel>

                    {problems.length > 0 && (
                        <Panel className="p-4 border-gold-500/30 flex flex-col gap-1.5">
                            <span className="text-xs text-gold-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {problems.length === 1 ? "One thing to fix" : `${problems.length} things to fix`}
                            </span>
                            {problems.slice(0, 6).map((problem, i) => (
                                <p key={i} className="text-[11px] text-ink-400">{problem.message}</p>
                            ))}
                        </Panel>
                    )}

                    {ordered.map((section, index) => (
                        <Panel key={index} className="p-4 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={section.kind}
                                    onChange={(e) => update(index, { kind: e.target.value as CmsPracticeSection["kind"] })}
                                    className="w-36"
                                >
                                    {SECTION_KINDS.map((kind) => (
                                        <option key={kind} value={kind}>{SECTION_LABELS[kind]}</option>
                                    ))}
                                </Select>

                                <TimeField
                                    label="from"
                                    value={section.start}
                                    onChange={(v) => update(index, { start: v })}
                                    onUsePlayhead={() => update(index, { start: Math.round(playhead * 10) / 10 })}
                                />
                                <TimeField
                                    label="to"
                                    value={section.end}
                                    onChange={(v) => update(index, { end: v })}
                                    onUsePlayhead={() => update(index, { end: Math.round(playhead * 10) / 10 })}
                                />

                                <button
                                    onClick={() => seek(section.start)}
                                    className="text-[11px] text-ink-500 hover:text-ink-100 transition-colors"
                                >
                                    listen
                                </button>

                                <button
                                    onClick={() => remove(index)}
                                    className="ml-auto p-1 text-ink-500 hover:text-red-300 transition-colors"
                                    title="Remove"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <Textarea
                                    rows={3}
                                    value={(section.lines || []).join("\n")}
                                    onChange={(e) =>
                                        update(index, {
                                            lines: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                                        })
                                    }
                                    placeholder="The lines sung in this part, one per line. Optional."
                                />
                                <span className="text-[11px] text-ink-500">
                                    Shown as a read-along. Leave blank for an instrumental part.
                                </span>
                            </label>
                        </Panel>
                    ))}

                    <Button size="sm" onClick={add} className="self-start">
                        <Plus className="w-3.5 h-3.5" /> Add section
                    </Button>
                </>
            )}
        </div>
    );
}

/** A time box that takes "1:23" or "83", with the playhead a click away. */
function TimeField({
    label,
    value,
    onChange,
    onUsePlayhead,
}: {
    label: string;
    value: number;
    onChange: (seconds: number) => void;
    onUsePlayhead: () => void;
}) {
    const [text, setText] = useState(formatTime(value));

    // Follows the value while someone is not typing in it — "Mark here" and the
    // playhead buttons both write straight to the section.
    useEffect(() => setText(formatTime(value)), [value]);

    const commit = () => {
        const parsed = parseTime(text);
        if (parsed === null) {
            setText(formatTime(value));
            return;
        }
        onChange(parsed);
    };

    return (
        <span className="flex items-center gap-1">
            <span className="text-[11px] text-ink-500">{label}</span>
            <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                className="w-20 text-center tabular-nums"
            />
            <button
                onClick={onUsePlayhead}
                title="Use the playhead"
                className="text-ink-500 hover:text-green-400 transition-colors"
            >
                <CircleDot className="w-3.5 h-3.5" />
            </button>
        </span>
    );
}
