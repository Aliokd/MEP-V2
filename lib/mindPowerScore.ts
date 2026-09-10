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

/** A day counts in full for consistency from this much engaged time. */
export const DAY_ACTIVE_SECONDS = 20 * 60;
/**
 * A day the person showed up but stayed under that counts this much of a
 * day. Turning up is most of the habit; the rest is staying.
 */
export const VISIT_DAY_CREDIT = 0.5;
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

/**
 * Engaged time in the week that earns the whole time bonus. The old goal's
 * 150 minutes, kept as a number people already know — but as points inside
 * the score now, not as a second way of being golden beside it. Two rules
 * gave two numbers, and a brain two thirds full over a score of 26 of 70
 * read as a mistake however carefully it was explained.
 */
export const TIME_GOAL_SECONDS = 150 * 60;

export type PartKey = 'consistency' | 'craft' | 'time' | 'health' | 'community';

export interface PartConfig {
    weight: number;
    /** Off until the features that feed it exist; its weight is redistributed. */
    enabled: boolean;
    /**
     * A bonus part adds its points on top of the others instead of taking a
     * share of the 100: the core parts still reach 100 without it, and the
     * total is capped there. Health is one while only some of its habits
     * exist — a breath counts, and nobody is penalised for what is not built.
     */
    bonus?: boolean;
}

export const SCORE_PARTS: Record<PartKey, PartConfig> = {
    consistency: { weight: 35, enabled: true },
    craft: { weight: 35, enabled: true },
    /** Minutes of real work, on top: long evenings count for more than the day they fall on. */
    time: { weight: 20, enabled: true, bonus: true },
    health: { weight: 20, enabled: true, bonus: true },
    community: { weight: 10, enabled: true },
};

export const PART_ORDER: PartKey[] = ['consistency', 'craft', 'time', 'health', 'community'];

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
    /** Days the person opened Veinote without reaching DAY_ACTIVE_SECONDS. */
    visitOnlyDays: number;
    /** Engaged seconds across the week, after the daily soft cap. */
    engagedSeconds: number;
    craft: CraftCounters;
    healthyDays: number;
    communityActions: number;
}

export interface PartScore {
    key: PartKey;
    /** 0–1 share of the part's goal. */
    ratio: number;
    points: number;
    /** What the part is worth in full, after redistribution: whole points, the core parts summing to 100. */
    max: number;
    enabled: boolean;
    /** Added on top of the core parts rather than sharing the 100 with them. */
    bonus: boolean;
}

export interface WeekScore {
    score: number;
    parts: PartScore[];
    activeDays: number;
    /** Create, Learn, Practice areas that met their threshold, 0–3. */
    craftAreas: number;
    golden: boolean;
    /** What each part was scored on, so the breakdown can show it rather than only the points. */
    detail: {
        activeDays: number;
        visitOnlyDays: number;
        /** Full days plus half a day per drop-in, before the five-day cap. */
        dayCredit: number;
        engagedSeconds: number;
        craftAreas: number;
        craftMet: CraftAreas;
        healthyDays: number;
        communityActions: number;
    };
}

/** How much of a tick to credit, given the engaged seconds already on the day. */
export function creditFor(seconds: number, daySoFar: number): number {
    if (daySoFar >= HALF_CREDIT_DAY_SECONDS) return 0;
    if (daySoFar >= FULL_CREDIT_DAY_SECONDS) return seconds / 2;
    return seconds;
}

export interface CraftAreas {
    create: boolean;
    learn: boolean;
    practice: boolean;
}

/** Which of the three craft areas met their weekly threshold. */
export function craftAreaFlags(c: CraftCounters): CraftAreas {
    return {
        create:
            c.words >= CRAFT_THRESHOLDS.words ||
            c.recordingSeconds >= CRAFT_THRESHOLDS.recordingSeconds ||
            c.sections >= CRAFT_THRESHOLDS.sections,
        learn: c.chapters >= CRAFT_THRESHOLDS.chapters,
        practice: c.practiceSeconds >= CRAFT_THRESHOLDS.practiceSeconds,
    };
}

export function craftAreasMet(c: CraftCounters): number {
    return Object.values(craftAreaFlags(c)).filter(Boolean).length;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function scoreWeek(input: WeekInput): WeekScore {
    const activeDays = input.daySeconds.filter(s => s >= DAY_ACTIVE_SECONDS).length;
    const craftAreas = craftAreasMet(input.craft);
    const dayCredit = activeDays + input.visitOnlyDays * VISIT_DAY_CREDIT;

    const ratios: Record<PartKey, number> = {
        consistency: clamp01(Math.min(CONSISTENCY_DAYS, dayCredit) / CONSISTENCY_DAYS),
        craft: clamp01(craftAreas / 3),
        time: clamp01(input.engagedSeconds / TIME_GOAL_SECONDS),
        health: clamp01(Math.min(HEALTH_DAYS, input.healthyDays) / HEALTH_DAYS),
        community: input.communityActions > 0 ? 1 : 0,
    };

    const maxima = partMaxima();
    const parts: PartScore[] = PART_ORDER.map(key => {
        const { enabled, bonus = false } = SCORE_PARTS[key];
        const max = maxima[key];
        return { key, ratio: ratios[key], points: enabled ? Math.round(ratios[key] * max) : 0, max, enabled, bonus };
    });

    // The score is the sum of the parts as shown, so what is listed always adds up to it.
    const score = Math.min(100, parts.reduce((sum, p) => sum + p.points, 0));
    return {
        score,
        parts,
        activeDays,
        craftAreas,
        golden: score >= WEEKLY_TARGET,
        detail: {
            activeDays,
            visitOnlyDays: input.visitOnlyDays,
            dayCredit,
            engagedSeconds: input.engagedSeconds,
            craftAreas,
            craftMet: craftAreaFlags(input.craft),
            healthyDays: input.healthyDays,
            communityActions: input.communityActions,
        },
    };
}

/**
 * What each part is worth in full, in whole points. The core parts share
 * exactly 100 between them: each takes the floor of its scaled weight, and
 * the points left over go to the largest remainders — so 35 / 35 / 10 becomes
 * 44 / 44 / 12, not the 44 / 44 / 13 that rounding each on its own gives. A
 * bonus part keeps its own weight on top; a disabled part is worth nothing.
 */
export function partMaxima(): Record<PartKey, number> {
    const core = PART_ORDER.filter(k => SCORE_PARTS[k].enabled && !SCORE_PARTS[k].bonus);
    const coreWeight = core.reduce((sum, k) => sum + SCORE_PARTS[k].weight, 0);
    const out = {} as Record<PartKey, number>;
    for (const key of PART_ORDER) {
        const { weight, enabled, bonus = false } = SCORE_PARTS[key];
        out[key] = !enabled ? 0 : bonus ? weight : 0;
    }
    if (coreWeight === 0) return out;
    const raw = core.map(k => (SCORE_PARTS[k].weight * 100) / coreWeight);
    const floors = raw.map(Math.floor);
    let left = 100 - floors.reduce((a, b) => a + b, 0);
    const byRemainder = raw
        .map((r, i) => ({ i, rem: r - floors[i] }))
        .sort((a, b) => b.rem - a.rem || a.i - b.i);
    for (const { i } of byRemainder) {
        if (left <= 0) break;
        floors[i] += 1;
        left -= 1;
    }
    core.forEach((k, i) => {
        out[k] = floors[i];
    });
    return out;
}
