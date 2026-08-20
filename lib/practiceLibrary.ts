/**
 * The practice song library, as the CMS stores it.
 *
 * Practice 1 — Master song structure — plays a recording and asks the songwriter
 * to name each part as it arrives. That only works if someone has written down
 * where the parts are, so a song here is an audio file plus a list of sections
 * with their start and end times.
 *
 * No React, no Firebase: the admin editor validates with these rules and the
 * platform maps with them, so "what counts as a well-formed song" is written
 * once. `app/platform/practice/data/sections.ts` owns the same kind vocabulary
 * for rendering — SECTION_KINDS below must stay in step with its SectionKind.
 */

export const SECTION_KINDS = [
    "intro",
    "verse",
    "prechorus",
    "chorus",
    "bridge",
    "solo",
    "outro",
    "other",
] as const;

export type PracticeSectionKind = (typeof SECTION_KINDS)[number];

export interface CmsPracticeSection {
    kind: PracticeSectionKind;
    /** Seconds into the master. */
    start: number;
    end: number;
    /** The lines sung in this part, for the read-along. */
    lines?: string[];
    /** One start time per line, if the vocal has been timed. */
    lineTimes?: number[];
}

/** Human-readable labels, so the editor never shows a raw enum. */
export const SECTION_LABELS: Record<PracticeSectionKind, string> = {
    intro: "Intro",
    verse: "Verse",
    prechorus: "Pre-chorus",
    chorus: "Chorus",
    bridge: "Bridge",
    solo: "Solo",
    outro: "Outro",
    other: "Other",
};

export function emptySection(startAt = 0): CmsPracticeSection {
    return { kind: "verse", start: startAt, end: startAt + 15, lines: [] };
}

/** mm:ss, the way an editor reads a timeline. */
export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Accepts "1:23", "83", "1:23.5" — whatever someone types into a time box. */
export function parseTime(value: string): number | null {
    const trimmed = (value || "").trim();
    if (!trimmed) return null;
    if (trimmed.includes(":")) {
        const [mins, secs] = trimmed.split(":");
        const m = Number(mins);
        const s = Number(secs);
        if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
        return m * 60 + s;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
}

export interface SectionProblem {
    /** Index into the section list, or -1 for a problem with the song itself. */
    index: number;
    message: string;
}

/**
 * Everything wrong with a structure, in the order an editor would fix it.
 *
 * Deliberately a list of problems rather than a boolean: a song with a gap in
 * the middle is publishable and a song whose sections overlap is not, and the
 * person doing the work needs to be told which of those they have.
 */
export function validateSections(
    sections: CmsPracticeSection[],
    durationSeconds?: number | null,
): SectionProblem[] {
    const problems: SectionProblem[] = [];

    if (sections.length === 0) {
        problems.push({ index: -1, message: "No sections yet — the exercise has nothing to ask about." });
        return problems;
    }

    const ordered = [...sections].sort((a, b) => a.start - b.start);

    ordered.forEach((section, i) => {
        const label = `${SECTION_LABELS[section.kind] || section.kind} at ${formatTime(section.start)}`;

        if (!(section.end > section.start)) {
            problems.push({ index: i, message: `${label} ends before it starts.` });
        }
        if (section.start < 0) {
            problems.push({ index: i, message: `${label} starts before the recording does.` });
        }
        if (durationSeconds && section.end > durationSeconds + 1) {
            problems.push({
                index: i,
                message: `${label} runs past the end of the audio (${formatTime(durationSeconds)}).`,
            });
        }

        const previous = ordered[i - 1];
        if (previous && section.start < previous.end - 0.001) {
            problems.push({
                index: i,
                message: `${label} overlaps the part before it, which ends at ${formatTime(previous.end)}.`,
            });
        }

        const lines = section.lines || [];
        const times = section.lineTimes || [];
        if (times.length > 0 && times.length !== lines.length) {
            problems.push({
                index: i,
                message: `${label} has ${times.length} line times for ${lines.length} lines — they must match, or leave the times out.`,
            });
        }
        times.forEach((time, t) => {
            if (time < section.start || time > section.end) {
                problems.push({ index: i, message: `${label}: line ${t + 1} is timed outside the section.` });
            }
            if (t > 0 && time < times[t - 1]) {
                problems.push({ index: i, message: `${label}: line ${t + 1} is timed before the line above it.` });
            }
        });
    });

    return problems;
}

/** Sections in playing order, which is the only order that makes sense downstream. */
export function sortSections(sections: CmsPracticeSection[]): CmsPracticeSection[] {
    return [...sections].sort((a, b) => a.start - b.start);
}
