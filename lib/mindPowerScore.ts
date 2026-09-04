/**
 * The Mind Power score: what a week is worth, out of 100, and what it takes
 * to make the week golden.
 *
 * Four parts, each a share of a goal times a weight. Parts can be switched
 * off — health is, until the habits that feed it ship — and the weights of
 * the parts that are on are scaled so the total still reaches 100. That
 * keeps the target the same number whatever is live, and means turning a
 * part on later adds a way to score rather than moving the bar.
 *
 * Nothing here reads storage; weeklyActivity assembles a WeekInput from what
 * it has recorded and hands it in. Pure functions, easy to test by hand.
 */

/** The weekly score that earns the golden mind and counts toward the streak. */
export const WEEKLY_TARGET = 70;

/** A day counts for consistency from this much engaged time. */
export const DAY_ACTIVE_SECONDS = 20 * 60;
/** Days that count toward consistency, at most. A sixth and seventh add nothing, on purpose. */
export const CONSISTENCY_DAYS = 5;
/** Healthy days that count, at most. */
export const HEALTH_DAYS = 5;

/** The soft daily cap: full credit to two hours, half credit to three, none past that. */
export const FULL_CREDIT_DAY_SECONDS = 120 * 60;
export const HALF_CREDIT_DAY_SECONDS = 180 * 60;

/** A minute is engaged if there was input within this long. */
export const ENGAGED_WINDOW_MS = 60 * 1000;

/** A missed week keeps the streak if it still had this much time, once per window. */
export const REST_WEEK_MIN_SECONDS = 60 * 60;
export const REST_WEEK_WINDOW = 8;

export type PartKey = 'consistency' | 'craft' | 'health' | 'community';

export interface PartConfig {
    weight: number;
    /** Off until the features that feed it exist; its weight is redistributed. */
    enabled: boolean;
}

export const SCORE_PARTS: Record<PartKey, PartConfig> = {
    consistency: { weight: 35, enabled: true },
    craft: { weight: 35, enabled: true },
    health: { weight: 20, enabled: false },
    community: { weight: 10, enabled: true },
};

export const PART_ORDER: PartKey[] = ['consistency', 'craft', 'health', 'community'];

/** The small weekly threshold in each craft area. Any one of the Create three is enough. */
export const CRAFT_THRESHOLDS = {
    words: 300,
    recordingSeconds: 10 * 60,
    sections: 1,
    chapters: 1,
    practiceSeconds: 10 * 60,
};

export interface CraftCounters {
    words: number;
    recordingSeconds: number;
    sections: number;
    chapters: number;
    practiceSeconds: number;
}

export interface WeekInput {
    /** Engaged seconds per day, in any order; days with none may be left out. */
    daySeconds: number[];
    craft: CraftCounters;
    healthyDays: number;
    communityActions: number;
}

export interface PartScore {
    key: PartKey;
    /** 0–1 share of the part's goal. */
    ratio: number;
    points: number;
    /** What the part is worth in full, after redistribution. */
    max: number;
    enabled: boolean;
}

export interface WeekScore {
    score: number;
    parts: PartScore[];
    activeDays: number;
    /** Create, Learn, Practice areas that met their threshold, 0–3. */
    craftAreas: number;
    golden: boolean;
}

/** How much of a tick to credit, given the engaged seconds already on the day. */
export function creditFor(seconds: number, daySoFar: number): number {
    if (daySoFar >= HALF_CREDIT_DAY_SECONDS) return 0;
    if (daySoFar >= FULL_CREDIT_DAY_SECONDS) return seconds / 2;
    return seconds;
}

export function craftAreasMet(c: CraftCounters): number {
    const create =
        c.words >= CRAFT_THRESHOLDS.words ||
        c.recordingSeconds >= CRAFT_THRESHOLDS.recordingSeconds ||
        c.sections >= CRAFT_THRESHOLDS.sections;
    const learn = c.chapters >= CRAFT_THRESHOLDS.chapters;
    const practice = c.practiceSeconds >= CRAFT_THRESHOLDS.practiceSeconds;
    return [create, learn, practice].filter(Boolean).length;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function scoreWeek(input: WeekInput): WeekScore {
    const activeDays = input.daySeconds.filter(s => s >= DAY_ACTIVE_SECONDS).length;
    const craftAreas = craftAreasMet(input.craft);

    const ratios: Record<PartKey, number> = {
        consistency: clamp01(Math.min(CONSISTENCY_DAYS, activeDays) / CONSISTENCY_DAYS),
        craft: clamp01(craftAreas / 3),
        health: clamp01(Math.min(HEALTH_DAYS, input.healthyDays) / HEALTH_DAYS),
        community: input.communityActions > 0 ? 1 : 0,
    };

    const enabledWeight = PART_ORDER.reduce((sum, k) => sum + (SCORE_PARTS[k].enabled ? SCORE_PARTS[k].weight : 0), 0);
    const scale = enabledWeight > 0 ? 100 / enabledWeight : 0;

    const parts: PartScore[] = PART_ORDER.map(key => {
        const { weight, enabled } = SCORE_PARTS[key];
        const max = enabled ? weight * scale : 0;
        return { key, ratio: ratios[key], points: enabled ? ratios[key] * max : 0, max, enabled };
    });

    const score = Math.round(parts.reduce((sum, p) => sum + p.points, 0));
    return { score, parts, activeDays, craftAreas, golden: score >= WEEKLY_TARGET };
}
