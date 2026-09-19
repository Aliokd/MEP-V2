/**
 * The six parts of the mind, and what each one grows on.
 *
 * The score says how much of a week there was; this says where in the mind it
 * went. Each region is fed by the kind of work it is named for, after the
 * anatomy the page draws: words for the language areas, listening and
 * recording for the auditory cortex, starting things for the prefrontal
 * cortex, finishing and remembering for the hippocampus, reward and social
 * return for the accumbens and amygdala. The corpus callosum has no work of
 * its own: it grows on breadth, on the other five moving in the same week,
 * which is the book's "represent music in multiple ways" made measurable.
 *
 * A region's share is the mean of its signals, each a small weekly threshold
 * that fills at once and never beyond, so a region reaches full on a modest,
 * balanced week rather than on volume. Nothing here reads storage:
 * weeklyActivity assembles a RegionInput from the week's record.
 *
 * Phase one uses only what the app already measures. The signals a region
 * still wants — verses finished, rhymes looked up, chords placed, listens —
 * join as they are counted, one line each in REGION_SIGNALS.
 */

export type RegionKey = 'prefrontal' | 'hippocampus' | 'reward' | 'auditory' | 'callosum' | 'language';

export const REGION_KEYS: RegionKey[] = ['prefrontal', 'hippocampus', 'reward', 'auditory', 'callosum', 'language'];

export type RegionSignalKey =
    | 'words'
    | 'recording'
    | 'practice'
    | 'newProjects'
    | 'focus'
    | 'songsFinished'
    | 'lessons'
    | 'revisited'
    | 'shares'
    | 'healthyDays'
    | 'breadth'
    | 'combined';

export interface RegionInput {
    words: number;
    recordingSeconds: number;
    practiceSeconds: number;
    /** Projects that first appeared this week. */
    newProjects: number;
    /** Projects from before this week that were written in again. */
    revisitedProjects: number;
    /** Projects that gained both words and a recording this week. */
    combinedProjects: number;
    focusSessions: number;
    songsFinished: number;
    lessons: number;
    healthyDays: number;
    communityActions: number;
}

interface SignalConfig {
    key: RegionSignalKey;
    goal: number;
    value: (input: RegionInput) => number;
}

/** The signals each region grows on, in the order they are shown. */
export const REGION_SIGNALS: Record<Exclude<RegionKey, 'callosum'>, SignalConfig[]> = {
    language: [{ key: 'words', goal: 300, value: i => i.words }],
    auditory: [
        { key: 'recording', goal: 10 * 60, value: i => i.recordingSeconds },
        { key: 'practice', goal: 10 * 60, value: i => i.practiceSeconds },
    ],
    prefrontal: [
        { key: 'newProjects', goal: 1, value: i => i.newProjects },
        { key: 'focus', goal: 1, value: i => i.focusSessions },
    ],
    hippocampus: [
        { key: 'songsFinished', goal: 1, value: i => i.songsFinished },
        { key: 'lessons', goal: 1, value: i => i.lessons },
        { key: 'revisited', goal: 1, value: i => i.revisitedProjects },
    ],
    reward: [
        { key: 'shares', goal: 1, value: i => i.communityActions },
        { key: 'healthyDays', goal: 2, value: i => i.healthyDays },
    ],
};

export interface RegionSignal {
    key: RegionSignalKey;
    value: number;
    goal: number;
    /** 0–1, the value against its goal. */
    ratio: number;
}

export interface RegionScore {
    key: RegionKey;
    /** 0–1, the mean of the signals. */
    ratio: number;
    signals: RegionSignal[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function scoreRegions(input: RegionInput): Record<RegionKey, RegionScore> {
    const out = {} as Record<RegionKey, RegionScore>;
    for (const key of REGION_KEYS) {
        if (key === 'callosum') continue;
        const signals = REGION_SIGNALS[key].map(s => {
            const value = s.value(input);
            return { key: s.key, value, goal: s.goal, ratio: clamp01(value / s.goal) };
        });
        const ratio = signals.reduce((sum, s) => sum + s.ratio, 0) / signals.length;
        out[key] = { key, ratio, signals };
    }
    // Integration: how many of the other five moved at all, lifted by the
    // projects where words and a recording met in the same week.
    const moved = REGION_KEYS.filter(k => k !== 'callosum' && out[k].ratio > 0).length;
    const breadth = { key: 'breadth' as const, value: moved, goal: 5, ratio: clamp01(moved / 5) };
    const combined = { key: 'combined' as const, value: input.combinedProjects, goal: 1, ratio: clamp01(input.combinedProjects) };
    out.callosum = {
        key: 'callosum',
        ratio: clamp01(breadth.ratio * 0.8 + combined.ratio * 0.4),
        signals: [breadth, combined],
    };
    return out;
}
