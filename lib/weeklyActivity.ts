"use client";

import { safeLocalStorageSetItem } from './storage';
import {
    scoreWeek,
    creditFor,
    WEEKLY_TARGET,
    REST_WEEK_MIN_SECONDS,
    REST_WEEK_WINDOW,
    type CraftCounters,
    type WeekScore,
} from './mindPowerScore';

/**
 * Time and work in Veinote, bucketed by week — the record behind Mind Power:
 * the brain's fill, the streak strip, the golden mind and the celebration.
 *
 * "Time" means engaged time: the tab was visible on a platform route and the
 * person had touched the keyboard or pointer within the last minute. A tab
 * left open is not someone writing, and crediting it would fill the brain
 * for whoever leaves Veinote open all day. The layout ticks this every
 * ACTIVITY_TICK_SECONDS while that holds, and the soft daily cap in
 * mindPowerScore decides how much of each tick counts.
 *
 * Alongside the seconds, per day, the record keeps what the week produced —
 * words, recordings, sections, chapters, practice — as the difference between
 * the app's lifetime counters at the start of the week and now, and any health
 * marks. mindPowerScore turns a week's record into its score; reaching
 * WEEKLY_TARGET makes the week golden.
 *
 * Buckets are keyed by the Monday of the week, local time, so a week reads the
 * same way it does on a calendar. Everything is kept: the strip scrolls back to
 * the first week, and a year of weeks is a few kilobytes.
 */

/** Seconds per week: the total the strip and the level read. Kept in step with the day map. */
export const WEEKLY_ACTIVITY_KEY = 'mep-weekly-active-seconds';
/** Engaged seconds per day, keyed week → day. */
export const WEEKLY_DAYS_KEY = 'mep-weekly-days';
/** The lifetime craft counters at the start of each week, and their latest reading. */
export const CRAFT_BASELINE_KEY = 'mep-mind-power-baselines';
/** Health marks per day: breathing, focus, break. */
export const HEALTH_MARKS_KEY = 'mep-health-marks';
export const WEEKLY_ACTIVITY_EVENT = 'veinote-weekly-activity-updated';

/**
 * Every week that has ever had time recorded, as week keys. Kept apart from
 * the buckets so a purge of the maps could never reset the level.
 */
export const ACTIVE_WEEKS_KEY = 'mep-active-weeks';

/**
 * Weeks whose golden-mind celebration has been shown, as week keys. The
 * popup fires on the tick that carries the week over the target, once per
 * week; this is what makes it once.
 */
export const GOLDEN_MIND_SHOWN_KEY = 'mep-golden-mind-shown';
/** Fired when the current week reaches the target for the first time. */
export const GOLDEN_MIND_EVENT = 'veinote-golden-mind';
/** The streak has been introduced to this account: the once-only popup on first sight. */
export const STREAK_INTRO_KEY = 'mep-streak-intro-shown';

/**
 * The goal that made a week golden before scoring existed: 150 minutes, at
 * any pace. Weeks recorded under that rule keep it, so nobody loses a gold
 * they already earned.
 */
export const WEEKLY_GOAL_SECONDS = 150 * 60;
export const WEEKLY_GOAL_MINUTES = WEEKLY_GOAL_SECONDS / 60;
export const ACTIVITY_TICK_SECONDS = 10;
/**
 * The streak strip never shows fewer cells than this: a new account's single
 * week is padded out with the weeks ahead, so the strip reads as a timeline
 * from day one rather than a lone brain.
 */
export const STREAK_MIN_WEEKS = 4;

type WeeklyMap = Record<string, number>;
type DaysMap = Record<string, Record<string, number>>;
/** The lifetime counters at one moment, community included. */
interface Snapshot extends CraftCounters {
    community: number;
}
interface CraftBaseline {
    start: Snapshot;
    latest: Snapshot;
}
type BaselineMap = Record<string, CraftBaseline>;
export type HealthMark = 'breathing' | 'focus' | 'break';
type HealthMap = Record<string, Partial<Record<HealthMark, number>>>;

export interface WeekCell {
    /** 'YYYY-MM-DD' of the week's Monday. */
    key: string;
    start: Date;
    /** 1 for the week the account first spent time in Veinote, counting up. */
    index: number;
    seconds: number;
    /** 0–1 share of what makes the week golden: the score against the target, or the old minute goal. */
    ratio: number;
    /** The week's score, out of 100; null for a week recorded before scoring. */
    score: number | null;
    golden: boolean;
    /** A missed week the streak forgave. */
    isRest: boolean;
    isCurrent: boolean;
    /** A week that has not started yet — padding at the end of the strip. */
    isFuture: boolean;
}

// ---- Keys and dates ----

/** Local-time Monday 00:00 of the week containing `date`. */
export function weekStart(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const sinceMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - sinceMonday);
    return d;
}

function dateKey(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

export function weekKey(date: Date): string {
    return dateKey(weekStart(date));
}

export function dayKey(date: Date): string {
    return dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
}

function parseKey(key: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
}

// ---- Storage ----

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        return parsed === null || typeof parsed !== 'object' ? fallback : (parsed as T);
    } catch {
        return fallback;
    }
}

export function readWeeklyActivity(): WeeklyMap {
    return readJson<WeeklyMap>(WEEKLY_ACTIVITY_KEY, {});
}

function readDays(): DaysMap {
    return readJson<DaysMap>(WEEKLY_DAYS_KEY, {});
}

function readBaselines(): BaselineMap {
    return readJson<BaselineMap>(CRAFT_BASELINE_KEY, {});
}

function readHealth(): HealthMap {
    return readJson<HealthMap>(HEALTH_MARKS_KEY, {});
}

function readActiveWeekKeys(): string[] {
    const parsed = readJson<unknown>(ACTIVE_WEEKS_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

function readGoldenMindShown(): string[] {
    const parsed = readJson<unknown>(GOLDEN_MIND_SHOWN_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

/** The app's lifetime counters, as the create, learn and practice tabs keep them. */
function readCraftTotals(): CraftCounters {
    if (typeof window === 'undefined') return { words: 0, recordingSeconds: 0, sections: 0, chapters: 0, practiceSeconds: 0 };
    const int = (key: string) => parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const len = (key: string) => {
        const parsed = readJson<unknown>(key, []);
        return Array.isArray(parsed) ? parsed.length : 0;
    };
    return {
        words: int('mep-create-words-typed'),
        recordingSeconds: int('mep-create-recording-seconds'),
        sections: len('mep-completed-songs'),
        chapters: len('mep-completed-lessons'),
        practiceSeconds: int('mep-practice-seconds'),
    };
}

function readCommunityTotal(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('mep-community-shared-count') || '0', 10) || 0;
}

// ---- Level ----

/**
 * How many distinct weeks have had time in Veinote. Unions the persistent list
 * with the bucket map, so weeks recorded before the list existed still count.
 */
export function readActiveWeekCount(): number {
    const keys = new Set(readActiveWeekKeys());
    for (const [key, seconds] of Object.entries(readWeeklyActivity())) {
        if (seconds > 0) keys.add(key);
    }
    return keys.size;
}

/** The Mind Power level: one per week spent in Veinote, never below 1. */
export function activeWeekLevel(): number {
    return Math.max(1, readActiveWeekCount());
}

// ---- Recording ----

/**
 * Note the lifetime counters against the week: the first reading of a week is
 * its baseline, and every later one its latest, so the week's own output is
 * the difference — and stays known after the week has passed.
 */
function snapshotCraft(week: string): void {
    const baselines = readBaselines();
    const now: Snapshot = { ...readCraftTotals(), community: readCommunityTotal() };
    const entry = baselines[week];
    if (!entry) baselines[week] = { start: now, latest: now };
    else entry.latest = now;
    safeLocalStorageSetItem(CRAFT_BASELINE_KEY, JSON.stringify(baselines));
}

/**
 * Credit a tick of engaged time to today, through the soft daily cap, and
 * tell listeners. A tick that was not engaged records nothing — presence is
 * not work — but still notes the counters, so a week of only writing without
 * the tab in focus is not lost.
 */
export function recordActiveSeconds(seconds: number, now: Date = new Date(), engaged: boolean = true): void {
    if (typeof window === 'undefined') return;
    const week = weekKey(now);
    const day = dayKey(now);

    if (engaged) {
        const days = readDays();
        const weekDays = days[week] || (days[week] = {});
        const credit = creditFor(seconds, weekDays[day] || 0);
        if (credit > 0) {
            weekDays[day] = (weekDays[day] || 0) + credit;
            safeLocalStorageSetItem(WEEKLY_DAYS_KEY, JSON.stringify(days));

            // The week total the strip and the level read, kept as the sum of its days.
            const map = readWeeklyActivity();
            map[week] = Object.values(weekDays).reduce((sum, s) => sum + s, 0);
            safeLocalStorageSetItem(WEEKLY_ACTIVITY_KEY, JSON.stringify(map));

            // First time this week: it joins the permanent tally behind the level.
            const active = readActiveWeekKeys();
            if (!active.includes(week)) {
                active.push(week);
                safeLocalStorageSetItem(ACTIVE_WEEKS_KEY, JSON.stringify(active));
            }
        }
    }

    snapshotCraft(week);
    window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));

    // Over the target and not yet celebrated: the golden mind is due. This
    // fires on every tick until the popup is dismissed, and the popup ignores
    // it while open — so a reload mid-celebration just brings it back.
    if (goldenMindDue(now)) {
        window.dispatchEvent(new CustomEvent(GOLDEN_MIND_EVENT));
    }
}

/** A health habit done today: a breathing exercise, a focus session run to zero, a break taken. */
export function recordHealthMark(kind: HealthMark, now: Date = new Date()): void {
    if (typeof window === 'undefined') return;
    const marks = readHealth();
    const day = dayKey(now);
    const today = marks[day] || (marks[day] = {});
    today[kind] = (today[kind] || 0) + 1;
    safeLocalStorageSetItem(HEALTH_MARKS_KEY, JSON.stringify(marks));
    window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));
}

// ---- Scoring ----

function weekDayKeys(week: string): string[] {
    const start = parseKey(week);
    if (!start) return [];
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return dateKey(d);
    });
}

/** The week's score from its record, or null for a week that predates day records. */
export function weekScore(week: string): WeekScore | null {
    const weekDays = readDays()[week];
    if (!weekDays) return null;
    const baseline = readBaselines()[week];
    const diff = (k: keyof Snapshot) => (baseline ? Math.max(0, (baseline.latest[k] || 0) - (baseline.start[k] || 0)) : 0);
    const health = readHealth();
    const healthyDays = weekDayKeys(week).filter(d => Object.values(health[d] || {}).some(n => n > 0)).length;
    return scoreWeek({
        daySeconds: Object.values(weekDays),
        craft: {
            words: diff('words'),
            recordingSeconds: diff('recordingSeconds'),
            sections: diff('sections'),
            chapters: diff('chapters'),
            practiceSeconds: diff('practiceSeconds'),
        },
        healthyDays,
        communityActions: diff('community'),
    });
}

/** Golden under whichever rule the week was recorded: the score, or the old minute goal. */
export function isGoldenWeek(week: string): boolean {
    const score = weekScore(week);
    if (score) return score.golden;
    return (readWeeklyActivity()[week] || 0) >= WEEKLY_GOAL_SECONDS;
}

/** 0–1 share of golden for the week, on the same rule. */
function goldenRatio(week: string): number {
    const score = weekScore(week);
    if (score) return Math.min(1, score.score / WEEKLY_TARGET);
    return Math.min(1, (readWeeklyActivity()[week] || 0) / WEEKLY_GOAL_SECONDS);
}

/** The current week has reached the target and its celebration has not been dismissed. */
export function goldenMindDue(now: Date = new Date()): boolean {
    if (typeof window === 'undefined') return false;
    const key = weekKey(now);
    return isGoldenWeek(key) && !readGoldenMindShown().includes(key);
}

/** The celebration was dismissed: it will not come back for this week. */
export function markGoldenMindShown(now: Date = new Date()): void {
    const key = weekKey(now);
    const shown = readGoldenMindShown();
    if (shown.includes(key)) return;
    shown.push(key);
    safeLocalStorageSetItem(GOLDEN_MIND_SHOWN_KEY, JSON.stringify(shown));
}

// ---- Streaks ----

/**
 * The Monday of the account's first week in Veinote — the earliest week with
 * time recorded, or this week for an account that has none yet. Never later
 * than the current week, whatever the stored keys say.
 */
export function firstWeekStart(now: Date = new Date()): Date {
    const current = weekStart(now);
    const keys = new Set(readActiveWeekKeys());
    for (const [key, seconds] of Object.entries(readWeeklyActivity())) {
        if (seconds > 0) keys.add(key);
    }
    let first = current;
    for (const key of keys) {
        const start = parseKey(key);
        if (start && start < first) first = weekStart(start);
    }
    return first;
}

function weekKeysFrom(first: Date, count: number): string[] {
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(first);
        d.setDate(first.getDate() + i * 7);
        return dateKey(d);
    });
}

export interface Streak {
    /** Golden weeks in a row, ending on the current week if it is golden, else on the last one. */
    current: number;
    best: number;
    /** Weeks the streak forgave. */
    restWeeks: Set<string>;
}

/**
 * Golden weeks in a row. A missed week keeps the streak going if it still had
 * REST_WEEK_MIN_SECONDS and no other week was forgiven in the last
 * REST_WEEK_WINDOW; two misses in a row end it. The current week, if not yet
 * golden, is in progress and neither counts nor breaks.
 */
export function computeStreak(now: Date = new Date()): Streak {
    const first = firstWeekStart(now);
    const current = weekStart(now);
    const elapsed = Math.round((current.getTime() - first.getTime()) / (7 * 24 * 3600 * 1000));
    const keys = weekKeysFrom(first, elapsed + 1);
    const seconds = readWeeklyActivity();
    const golden = keys.map(k => isGoldenWeek(k));
    const restWeeks = new Set<string>();

    // Forward pass for the best streak and which weeks were forgiven.
    let run = 0;
    let best = 0;
    let lastRestAt = -Infinity;
    for (let i = 0; i < keys.length; i++) {
        const isCurrent = i === keys.length - 1;
        if (golden[i]) {
            run++;
        } else if (isCurrent) {
            // In progress: leave the run standing.
        } else if (run > 0 && (seconds[keys[i]] || 0) >= REST_WEEK_MIN_SECONDS && i - lastRestAt >= REST_WEEK_WINDOW) {
            restWeeks.add(keys[i]);
            lastRestAt = i;
        } else {
            run = 0;
        }
        best = Math.max(best, run);
    }

    // The current streak is the run that reaches the present.
    return { current: run, best, restWeeks };
}

/**
 * The streak strip: every week from the account's first to the current one,
 * oldest first and numbered from 1, padded with the weeks ahead so there are
 * never fewer than STREAK_MIN_WEEKS cells.
 */
export function streakWeeks(now: Date = new Date()): WeekCell[] {
    const map = readWeeklyActivity();
    const current = weekStart(now);
    const first = firstWeekStart(now);
    const elapsed = Math.round((current.getTime() - first.getTime()) / (7 * 24 * 3600 * 1000));
    const total = Math.max(elapsed + 1, STREAK_MIN_WEEKS);
    const { restWeeks } = computeStreak(now);

    const cells: WeekCell[] = [];
    for (let i = 0; i < total; i++) {
        const start = new Date(first);
        start.setDate(first.getDate() + i * 7);
        const key = dateKey(start);
        const isFuture = i > elapsed;
        const seconds = isFuture ? 0 : map[key] || 0;
        const score = isFuture ? null : weekScore(key);
        cells.push({
            key,
            start,
            index: i + 1,
            seconds,
            ratio: isFuture ? 0 : goldenRatio(key),
            score: score ? score.score : null,
            golden: !isFuture && isGoldenWeek(key),
            isRest: restWeeks.has(key),
            isCurrent: i === elapsed,
            isFuture,
        });
    }
    return cells;
}
