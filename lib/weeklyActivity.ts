"use client";

import { safeLocalStorageSetItem } from './storage';
import {
    scoreWeek,
    creditFor,
    DAY_ACTIVE_SECONDS,
    MAX_DAY_CREDIT_SECONDS,
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
/** Every day Veinote was opened, as day keys — showing up, before any minute is counted. */
export const DAILY_VISITS_KEY = 'mep-daily-visits';
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
/** The account's first day in Veinote, as a day key — the day it was created. */
export const FIRST_DAY_KEY = 'mep-first-day';
/** History before tracking has been reconstructed for this account (see backfillHistory). */
export const HISTORY_BACKFILLED_KEY = 'mep-history-backfilled';
/** Weeks before tracking judged golden from the record that survived. */
export const LEGACY_GOLDEN_KEY = 'mep-legacy-golden-weeks';
/** Words and recorded seconds per project, written by Create for every project that exists. */
export const PROJECT_CRAFT_KEY = 'mep-project-craft';
/**
 * Shares in Connect per week, counted from the posts that still exist, kept
 * by the platform layout's live listener. The running week follows the
 * listener; a closed week keeps the number it closed with.
 */
export const COMMUNITY_WEEKS_KEY = 'mep-community-weeks';
/**
 * What the account's other devices have recorded, already summed, as pulled
 * from the account record (see mindPowerRecord). This device's own maps stay
 * its own; every reader that scores or draws a week adds these in.
 */
export const OTHERS_KEY = 'mep-mind-power-others';
/** Songs that were finished and then deleted, so a union with another device cannot bring them back. */
export const FORGOTTEN_SONGS_KEY = 'mep-forgotten-songs';
/** Fired by every writer here: the local record changed and should reach the account. */
export const MIND_POWER_DIRTY_EVENT = 'veinote-mind-power-dirty';

/**
 * The goal that made a week golden before scoring existed: 150 minutes, at
 * any pace. Weeks recorded under that rule keep it, so nobody loses a gold
 * they already earned.
 */
export const WEEKLY_GOAL_SECONDS = 150 * 60;
export const WEEKLY_GOAL_MINUTES = WEEKLY_GOAL_SECONDS / 60;
export const ACTIVITY_TICK_SECONDS = 10;
/**
 * Weeks ahead shown after the current one, so the strip can hold the current
 * week in the middle with the past on its left and what is coming on its
 * right — a timeline, not a ledger that ends at today.
 */
export const FUTURE_WEEKS = 2;

type WeeklyMap = Record<string, number>;
type DaysMap = Record<string, Record<string, number>>;
/** Words and recorded seconds in one project, as it stands now. */
export interface ProjectCraft {
    words: number;
    recordingSeconds: number;
}
type ProjectCraftMap = Record<string, ProjectCraft>;

/**
 * The lifetime counters at one moment, community included — and, where the
 * record keeps them, the per-project and per-id detail behind the totals.
 * Totals only go up; the detail is what lets a week go down again when a
 * share is deleted or a song's words are cut. See craftBetween.
 */
interface Snapshot extends CraftCounters {
    community: number;
    /** Per project, so a deleted project takes only its own words with it. */
    projects?: ProjectCraftMap;
    /** Songs completed, by id. */
    sectionIds?: string[];
    /** Lessons mastered, by id. */
    chapterIds?: string[];
    /**
     * Counters the device taking this reading had never written (see
     * absentCraftKeys). A zero here is "not known", not "none": a merge takes
     * those from a reading that knew, and never lets them win.
     */
    absent?: AbsentKey[];
}
type AbsentKey = 'words' | 'recordingSeconds' | 'chapters' | 'projects';
interface CraftBaseline {
    start: Snapshot;
    latest: Snapshot;
    /** When each reading was taken, so two devices' readings of one week can be ordered. */
    startedAt?: number;
    latestAt?: number;
    /**
     * The week's output, fixed once the week has passed. The running week is
     * live — undo something and it leaves the score — but a closed week stays
     * closed, so deleting an old song can never take back a gold already won.
     * The per-project detail is dropped when this is set; it was only ever
     * needed while the week could still change.
     */
    final?: CraftCounters;
}
type BaselineMap = Record<string, CraftBaseline>;
export type HealthMark = 'breathing' | 'focus' | 'break' | 'session';
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

/**
 * The account's other devices, summed. Written only by mindPowerRecord when
 * the account record arrives; read by everything that scores.
 */
export interface OthersRecord {
    days: DaysMap;
    health: HealthMap;
    visits: string[];
    /** Their lifetime practice seconds, added to this device's own. */
    practiceSeconds: number;
    /** Their week totals, for weeks before day records (backfilled history). */
    weekSeconds: WeeklyMap;
}

const NO_OTHERS: OthersRecord = { days: {}, health: {}, visits: [], practiceSeconds: 0, weekSeconds: {} };

function readOthers(): OthersRecord {
    const parsed = readJson<Partial<OthersRecord>>(OTHERS_KEY, {});
    return {
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
        health: parsed.health && typeof parsed.health === 'object' ? parsed.health : {},
        visits: Array.isArray(parsed.visits) ? parsed.visits.filter((k): k is string => typeof k === 'string') : [],
        practiceSeconds: typeof parsed.practiceSeconds === 'number' ? parsed.practiceSeconds : 0,
        weekSeconds: parsed.weekSeconds && typeof parsed.weekSeconds === 'object' ? parsed.weekSeconds : {},
    };
}

/** mindPowerRecord hands over what the other devices hold; a change is announced. */
export function applyOthers(others: OthersRecord): boolean {
    if (typeof window === 'undefined') return false;
    const next = JSON.stringify(others);
    if ((localStorage.getItem(OTHERS_KEY) || '') === next) return false;
    safeLocalStorageSetItem(OTHERS_KEY, next);
    return true;
}

// The maps this device writes are its own. What it *reads* for a score is its
// own plus the other devices', so the same week scores the same everywhere.
function readOwnDays(): DaysMap {
    return readJson<DaysMap>(WEEKLY_DAYS_KEY, {});
}
function readOwnHealth(): HealthMap {
    return readJson<HealthMap>(HEALTH_MARKS_KEY, {});
}
function readOwnVisits(): string[] {
    const parsed = readJson<unknown>(DAILY_VISITS_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}
function readOwnWeeklyActivity(): WeeklyMap {
    return readJson<WeeklyMap>(WEEKLY_ACTIVITY_KEY, {});
}

/** Engaged seconds per day across every device, each day held to the cap. */
function readDays(): DaysMap {
    const own = readOwnDays();
    const others = readOthers().days;
    if (Object.keys(others).length === 0) return own;
    const merged: DaysMap = {};
    for (const source of [own, others]) {
        for (const [week, days] of Object.entries(source)) {
            const target = merged[week] || (merged[week] = {});
            for (const [day, seconds] of Object.entries(days)) {
                target[day] = Math.min(MAX_DAY_CREDIT_SECONDS, (target[day] || 0) + (seconds || 0));
            }
        }
    }
    return merged;
}

/** Health marks per day across every device: each device's marks were its own, so they add. */
function readHealth(): HealthMap {
    const own = readOwnHealth();
    const others = readOthers().health;
    if (Object.keys(others).length === 0) return own;
    const merged: HealthMap = {};
    for (const source of [own, others]) {
        for (const [day, marks] of Object.entries(source)) {
            const target = merged[day] || (merged[day] = {});
            for (const [kind, n] of Object.entries(marks) as [HealthMark, number][]) {
                target[kind] = (target[kind] || 0) + (n || 0);
            }
        }
    }
    return merged;
}

/** Every day the account showed up, on any device. */
function readVisits(): string[] {
    const others = readOthers().visits;
    if (others.length === 0) return readOwnVisits();
    return Array.from(new Set([...readOwnVisits(), ...others])).sort();
}

/**
 * Week totals across every device. A week with day records is the sum of its
 * merged days; a week from before day records (backfilled history) keeps the
 * larger of what any device holds for it.
 */
export function readWeeklyActivity(): WeeklyMap {
    const own = readOwnWeeklyActivity();
    const others = readOthers();
    if (Object.keys(others.days).length === 0 && Object.keys(others.weekSeconds).length === 0) return own;
    const merged: WeeklyMap = { ...own };
    for (const [week, seconds] of Object.entries(others.weekSeconds)) {
        merged[week] = Math.max(merged[week] || 0, seconds || 0);
    }
    for (const [week, days] of Object.entries(readDays())) {
        const sum = Object.values(days).reduce((a, b) => a + b, 0);
        merged[week] = Math.max(merged[week] || 0, sum);
    }
    return merged;
}

function readBaselines(): BaselineMap {
    return readJson<BaselineMap>(CRAFT_BASELINE_KEY, {});
}

/** Tell the account record something here changed. Urgent means a discrete act, not a tick. */
export function markMindPowerDirty(urgent: boolean = false): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MIND_POWER_DIRTY_EVENT, { detail: { urgent } }));
}

function readLegacyGolden(): string[] {
    const parsed = readJson<unknown>(LEGACY_GOLDEN_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

function readActiveWeekKeys(): string[] {
    const parsed = readJson<unknown>(ACTIVE_WEEKS_KEY, []);
    const own = Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
    // A week another device spent time in is a week the account spent time in.
    const others = Object.entries(readOthers().weekSeconds).filter(([, s]) => s > 0).map(([w]) => w);
    const otherDays = Object.entries(readOthers().days).filter(([, d]) => Object.values(d).some(s => s > 0)).map(([w]) => w);
    return Array.from(new Set([...own, ...others, ...otherDays]));
}

export function readGoldenMindShown(): string[] {
    const parsed = readJson<unknown>(GOLDEN_MIND_SHOWN_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

/**
 * Weeks celebrated on another device join the local list, so the popup for a
 * week never shows twice to one account. Union only: a mark never vanishes.
 */
export function mergeGoldenMindShown(keys: string[]): void {
    if (typeof window === 'undefined' || keys.length === 0) return;
    const merged = Array.from(new Set([...readGoldenMindShown(), ...keys.filter(k => typeof k === 'string')])).sort();
    safeLocalStorageSetItem(GOLDEN_MIND_SHOWN_KEY, JSON.stringify(merged));
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
        // Practice minutes are counted on the device they happen on; the account's
        // total is this device's plus every other's.
        practiceSeconds: int('mep-practice-seconds') + readOthers().practiceSeconds,
    };
}

/**
 * Practice time for the whole account: this device's seconds plus every other
 * device's, as the account record carries them. Practice is counted on the
 * device it happens on and nowhere else, so a reading that stops at the local
 * counter is one device's evenings, not the account's — 279 minutes on the
 * laptop and 0 on the phone, for the same person.
 */
export function accountPracticeSeconds(): number {
    if (typeof window === 'undefined') return 0;
    const own = parseInt(localStorage.getItem('mep-practice-seconds') || '0', 10) || 0;
    return own + readOthers().practiceSeconds;
}

/**
 * Which counters this device has never written. Words, recordings, lessons and
 * the per-project map are rebuilt from Firestore only when their tab is opened
 * here, so on a device that has not opened Create yet they are simply absent —
 * not zero. A reading must not take an absent counter as a drop.
 */
function absentCraftKeys(): Set<AbsentKey> {
    const absent = new Set<AbsentKey>();
    if (typeof window === 'undefined') return absent;
    if (localStorage.getItem('mep-create-words-typed') === null) absent.add('words');
    if (localStorage.getItem('mep-create-recording-seconds') === null) absent.add('recordingSeconds');
    if (localStorage.getItem('mep-completed-lessons') === null) absent.add('chapters');
    if (localStorage.getItem(PROJECT_CRAFT_KEY) === null) absent.add('projects');
    return absent;
}

function readCommunityTotal(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('mep-community-shared-count') || '0', 10) || 0;
}

function readIds(key: string): string[] {
    const parsed = readJson<unknown>(key, []);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
}

/** The per-project record, or null before Create has ever written it. */
export function readProjectCraft(): ProjectCraftMap | null {
    if (typeof window === 'undefined') return null;
    const parsed = readJson<unknown>(PROJECT_CRAFT_KEY, null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: ProjectCraftMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;
        const v = value as Partial<ProjectCraft>;
        out[id] = {
            words: Math.max(0, Math.floor(Number(v.words) || 0)),
            recordingSeconds: Math.max(0, Math.floor(Number(v.recordingSeconds) || 0)),
        };
    }
    return out;
}

/**
 * Create's reading of every project that exists: the whole map at once, so a
 * project that was deleted simply is not in it any more.
 */
export function writeProjectCraft(map: ProjectCraftMap): void {
    if (typeof window === 'undefined') return;
    safeLocalStorageSetItem(PROJECT_CRAFT_KEY, JSON.stringify(map));
}

/** A second of a take in progress, on the project being recorded; the save rewrites the map from the real durations. */
export function bumpProjectRecording(projectId: string | null, seconds: number = 1): void {
    if (typeof window === 'undefined' || !projectId) return;
    const map = readProjectCraft() || {};
    const entry = map[projectId] || (map[projectId] = { words: 0, recordingSeconds: 0 });
    entry.recordingSeconds += seconds;
    writeProjectCraft(map);
}

/** A project is gone: it is no longer a song finished, this week or any other. */
export function forgetCompletedSong(projectId: string): void {
    if (typeof window === 'undefined') return;
    const done = readIds('mep-completed-songs');
    if (done.includes(projectId)) {
        safeLocalStorageSetItem('mep-completed-songs', JSON.stringify(done.filter(id => id !== projectId)));
    }
    const dates = readJson<Record<string, number>>('mep-completed-song-dates', {});
    if (dates && typeof dates === 'object' && projectId in dates) {
        delete dates[projectId];
        safeLocalStorageSetItem('mep-completed-song-dates', JSON.stringify(dates));
    }
    // A tombstone, so the account record cannot hand the song back from
    // another device that still lists it.
    const forgotten = readIds(FORGOTTEN_SONGS_KEY);
    if (!forgotten.includes(projectId)) {
        safeLocalStorageSetItem(FORGOTTEN_SONGS_KEY, JSON.stringify([...forgotten, projectId]));
    }
    markMindPowerDirty(true);
}

function readCommunityWeeks(): Record<string, number> {
    const parsed = readJson<unknown>(COMMUNITY_WEEKS_KEY, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [week, n] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof n === 'number' && Number.isFinite(n)) out[week] = Math.max(0, Math.floor(n));
    }
    return out;
}

/**
 * Shares per week from the posts that exist right now. The running week takes
 * the live number, up or down; a closed week keeps what it has, and only a
 * week with no number yet is filled from history — which is how weeks before
 * tracking get their shares counted at all.
 */
export function recordCommunityWeeks(sharesByWeek: Record<string, number>, now: Date = new Date()): boolean {
    if (typeof window === 'undefined') return false;
    const current = weekKey(now);
    const weeks = readCommunityWeeks();
    let changed = false;
    const live = sharesByWeek[current] || 0;
    if (weeks[current] !== live) {
        weeks[current] = live;
        changed = true;
    }
    for (const [week, n] of Object.entries(sharesByWeek)) {
        if (week === current || week in weeks) continue;
        weeks[week] = n;
        changed = true;
    }
    if (changed) safeLocalStorageSetItem(COMMUNITY_WEEKS_KEY, JSON.stringify(weeks));
    return changed;
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
function snapshotCraft(week: string, at: number = Date.now()): boolean {
    const baselines = readBaselines();
    const entry = baselines[week];
    const now: Snapshot = {
        ...readCraftTotals(),
        community: readCommunityTotal(),
        projects: readProjectCraft() ?? undefined,
        sectionIds: readIds('mep-completed-songs'),
        chapterIds: readIds('mep-completed-lessons'),
    };
    // A counter this device has never written keeps the reading the account
    // already has, and the reading says so, so a merge never takes it for a
    // drop; see absentCraftKeys.
    const absent = absentCraftKeys();
    if (absent.size > 0) now.absent = [...absent].sort();
    if (entry) {
        for (const key of absent) {
            if (key === 'projects') {
                if (entry.latest.projects) now.projects = entry.latest.projects;
            } else if (key === 'chapters') {
                now.chapters = entry.latest.chapters;
                if (entry.latest.chapterIds) now.chapterIds = entry.latest.chapterIds;
            } else {
                now[key] = entry.latest[key];
            }
        }
    }
    let changed = false;
    if (!entry) {
        baselines[week] = { start: now, latest: now, startedAt: at, latestAt: at };
        changed = true;
    } else if (JSON.stringify(entry.latest) !== JSON.stringify(now)) {
        entry.latest = now;
        entry.latestAt = at;
        changed = true;
    }
    // Every other week is over: fix its output and drop the detail behind it.
    for (const [key, b] of Object.entries(baselines)) {
        if (key === week || b.final) continue;
        b.final = craftBetween(b.start, b.latest);
        delete b.start.projects;
        delete b.latest.projects;
        changed = true;
    }
    if (changed) safeLocalStorageSetItem(CRAFT_BASELINE_KEY, JSON.stringify(baselines));
    return changed;
}

/**
 * What a week produced, from its first reading to its latest.
 *
 * Where both readings carry detail, the week is the sum of what each project
 * gained and each id that is new — so cutting words, deleting a project or a
 * recording, or unmarking a lesson takes exactly that back, and deleting an
 * old project takes nothing from this week. Where the detail is missing (a
 * record from before it was kept) the totals' difference stands in, never
 * below zero.
 */
function craftBetween(start: Snapshot, latest: Snapshot): CraftCounters {
    const gained = (k: keyof CraftCounters) => Math.max(0, (latest[k] || 0) - (start[k] || 0));

    let words = gained('words');
    let recordingSeconds = gained('recordingSeconds');
    if (latest.projects && start.projects) {
        words = 0;
        recordingSeconds = 0;
        for (const [id, now] of Object.entries(latest.projects)) {
            const before = start.projects[id];
            words += Math.max(0, now.words - (before?.words ?? 0));
            recordingSeconds += Math.max(0, now.recordingSeconds - (before?.recordingSeconds ?? 0));
        }
    }

    const newIds = (after?: string[], before?: string[]) =>
        after && before ? after.filter(id => !before.includes(id)).length : null;
    return {
        words,
        recordingSeconds,
        sections: newIds(latest.sectionIds, start.sectionIds) ?? gained('sections'),
        chapters: newIds(latest.chapterIds, start.chapterIds) ?? gained('chapters'),
        practiceSeconds: gained('practiceSeconds'),
    };
}

/** The week's craft output, or null for a week with no counter record. */
function weekCraft(week: string): CraftCounters | null {
    const b = readBaselines()[week];
    if (!b) return null;
    return b.final ?? craftBetween(b.start, b.latest);
}

/** Shares this week: the live count where one is kept, else the counter difference. */
function weekCommunity(week: string): number {
    const live = readCommunityWeeks()[week];
    if (typeof live === 'number') return live;
    const b = readBaselines()[week];
    return b ? Math.max(0, (b.latest.community || 0) - (b.start.community || 0)) : 0;
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

    let moved = false;
    if (engaged) {
        // The cap is judged against the whole day, every device included, so
        // two screens cannot earn one day twice over.
        const daySoFar = readDays()[week]?.[day] || 0;
        const credit = creditFor(seconds, daySoFar);
        if (credit > 0) {
            const days = readOwnDays();
            const weekDays = days[week] || (days[week] = {});
            weekDays[day] = (weekDays[day] || 0) + credit;
            safeLocalStorageSetItem(WEEKLY_DAYS_KEY, JSON.stringify(days));

            // This device's week total, kept as the sum of its own days.
            const map = readOwnWeeklyActivity();
            map[week] = Object.values(weekDays).reduce((sum, s) => sum + s, 0);
            safeLocalStorageSetItem(WEEKLY_ACTIVITY_KEY, JSON.stringify(map));

            // First time this week: it joins the permanent tally behind the level.
            const active = readJson<string[]>(ACTIVE_WEEKS_KEY, []);
            if (!active.includes(week)) {
                active.push(week);
                safeLocalStorageSetItem(ACTIVE_WEEKS_KEY, JSON.stringify(active));
            }
            moved = true;
        }
    }

    if (snapshotCraft(week)) moved = true;
    if (moved) markMindPowerDirty(false);
    window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));

    // Over the target and not yet celebrated: the golden mind is due. This
    // fires on every tick until the popup is dismissed, and the popup ignores
    // it while open — so a reload mid-celebration just brings it back.
    if (goldenMindDue(now)) {
        window.dispatchEvent(new CustomEvent(GOLDEN_MIND_EVENT));
    }
}

/**
 * Veinote was opened today. Half a day of consistency on its own, and a day
 * of the daily streak — recorded once per day, so calling it every tick is free.
 */
export function recordVisit(now: Date = new Date()): void {
    if (typeof window === 'undefined') return;
    // Note the counters as they stand, so a week's output is current from the
    // first moment and not only from the first tick — and so a save that moves
    // them is announced, whether or not it is the day's first visit.
    const countersMoved = snapshotCraft(weekKey(now));
    const day = dayKey(now);
    const visits = readOwnVisits();
    const firstToday = !visits.includes(day);
    if (firstToday) {
        visits.push(day);
        safeLocalStorageSetItem(DAILY_VISITS_KEY, JSON.stringify(visits));
    }
    if (firstToday || countersMoved) {
        markMindPowerDirty(false);
        window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));
    }
}

/** A day the person was here: a visit mark, or engaged time from before visits were kept. */
function visitedDays(): Set<string> {
    const days = new Set(readVisits());
    for (const week of Object.values(readDays())) {
        for (const [day, seconds] of Object.entries(week)) {
            if (seconds > 0) days.add(day);
        }
    }
    return days;
}

/**
 * Days in a row with a visit, ending today — or yesterday, if today has not
 * been opened yet, so a streak is never shown broken before the day is over.
 */
export function dayStreak(now: Date = new Date()): number {
    if (typeof window === 'undefined') return 0;
    const visited = visitedDays();
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!visited.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let run = 0;
    while (visited.has(dateKey(cursor))) {
        run++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return run;
}

/** A health habit done today: a breathing exercise, a focus session run to zero, a break taken. */
export function recordHealthMark(kind: HealthMark, now: Date = new Date()): void {
    if (typeof window === 'undefined') return;
    const marks = readOwnHealth();
    const day = dayKey(now);
    const today = marks[day] || (marks[day] = {});
    today[kind] = (today[kind] || 0) + 1;
    safeLocalStorageSetItem(HEALTH_MARKS_KEY, JSON.stringify(marks));
    markMindPowerDirty(true);
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

/** The week's score from its record, or null for a week that predates day records and visits. */
export function weekScore(week: string): WeekScore | null {
    const allDays = readDays();
    const visitsInWeek = weekDayKeys(week).some(d => readVisits().includes(d));
    if (!allDays[week] && !visitsInWeek) return null;
    const weekDays = allDays[week] || {};
    const health = readHealth();
    const keys = weekDayKeys(week);
    const healthyDays = keys.filter(d => Object.values(health[d] || {}).some(n => n > 0)).length;
    const visits = new Set(readVisits());
    const visitOnlyDays = keys.filter(d => visits.has(d) && (weekDays[d] || 0) < DAY_ACTIVE_SECONDS).length;
    return scoreWeek({
        daySeconds: Object.values(weekDays),
        visitOnlyDays,
        engagedSeconds: readWeeklyActivity()[week] || 0,
        craft: weekCraft(week) ?? { words: 0, recordingSeconds: 0, sections: 0, chapters: 0, practiceSeconds: 0 },
        healthyDays,
        communityActions: weekCommunity(week),
    });
}

/**
 * Golden: the score reached the target. A week from before scoring, with
 * time on the clock and no day records, is judged by the old goal's 150
 * minutes instead — someone who was in Veinote every evening deserves that
 * week and the streak it starts. For scored weeks the minutes are inside the
 * score (the time part), not a second rule beside it.
 */
export function isGoldenWeek(week: string): boolean {
    return weekGoldenRatio(week) >= 1;
}

export interface WeekRecapLocal {
    minutes: number;
    /** Days with DAY_ACTIVE_SECONDS or more. */
    activeDays: number;
    /** Days with any visit or time at all. */
    visitDays: number;
    /** The week's own output; null for a week recorded before the counters were kept. */
    craft: CraftCounters | null;
    healthMarks: number;
    score: WeekScore | null;
}

/** Everything the local record knows about one week, for looking back at it. */
export function weekRecapLocal(week: string): WeekRecapLocal {
    const keys = weekDayKeys(week);
    const days = readDays()[week] || {};
    const visits = new Set(readVisits());
    const health = readHealth();
    return {
        minutes: Math.round((readWeeklyActivity()[week] || 0) / 60),
        activeDays: Object.values(days).filter(s => s >= DAY_ACTIVE_SECONDS).length,
        visitDays: keys.filter(d => visits.has(d) || (days[d] || 0) > 0).length,
        craft: weekCraft(week),
        healthMarks: keys.reduce((sum, d) => sum + Object.values(health[d] || {}).reduce((a, b) => a + b, 0), 0),
        score: weekScore(week),
    };
}

/**
 * 0–1 share of golden for the week: the score against the target, which is
 * the one number the brain, the pill and the breakdown all show. Only a week
 * with no score at all (before scoring existed) is read by its minutes.
 */
export function weekGoldenRatio(week: string): number {
    if (readLegacyGolden().includes(week)) return 1;
    const score = weekScore(week);
    if (score) return Math.min(1, score.score / WEEKLY_TARGET);
    return Math.min(1, (readWeeklyActivity()[week] || 0) / WEEKLY_GOAL_SECONDS);
}

/** This week's share of golden — what the header pill and the brain fill to. */
export function currentWeekRatio(now: Date = new Date()): number {
    if (typeof window === 'undefined') return 0;
    return weekGoldenRatio(weekKey(now));
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

// ---- History before tracking ----

export interface HistoryEvidence {
    /** The account's creation time, as Firebase Auth reports it. */
    creationTime?: string | null;
    /** Dates on which something of the person's was made or changed — ISO strings or epoch ms. */
    activityDates: (string | number)[];
}

/** A week before tracking is golden on this many distinct days of evidence. */
const LEGACY_GOLDEN_DAYS = 3;
/** Nominal credit per day of evidence, so an old week fills a little and can be a rest week. */
const LEGACY_DAY_SECONDS = DAY_ACTIVE_SECONDS;

/**
 * Accounts older than Mind Power have history it never saw. What survives is
 * the account's creation date and the dates their songs were last touched;
 * this turns that into the record it would have kept: the first day, a
 * visit on every day with evidence, and a share of the week for each. A
 * week with LEGACY_GOLDEN_DAYS days of evidence is judged golden — the same
 * spread-over-days idea the score rewards, from the only signal that is left.
 *
 * Runs once per account, and never touches a day from the tracked era
 * onward: the real record always wins over the reconstruction.
 */
export function backfillHistory(evidence: HistoryEvidence, now: Date = new Date()): boolean {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem(HISTORY_BACKFILLED_KEY)) return false;

    // Nothing recorded so far counts as "tracked from today".
    const trackedDays = [...visitedDays()].sort();
    const trackedFrom = trackedDays[0] || dayKey(now);

    const created = evidence.creationTime ? new Date(evidence.creationTime) : null;
    if (created && !Number.isNaN(created.getTime())) {
        safeLocalStorageSetItem(FIRST_DAY_KEY, dayKey(created));
    }

    const days = new Set<string>();
    for (const raw of evidence.activityDates) {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) continue;
        const key = dayKey(d);
        if (key < trackedFrom && key <= dayKey(now)) days.add(key);
    }

    if (days.size > 0) {
        const visits = new Set(readOwnVisits());
        days.forEach(d => visits.add(d));
        safeLocalStorageSetItem(DAILY_VISITS_KEY, JSON.stringify([...visits].sort()));

        const perWeek = new Map<string, number>();
        days.forEach(d => {
            const w = weekKey(parseKey(d) as Date);
            perWeek.set(w, (perWeek.get(w) || 0) + 1);
        });

        const map = readOwnWeeklyActivity();
        const active = new Set(readJson<string[]>(ACTIVE_WEEKS_KEY, []));
        const golden = new Set(readLegacyGolden());
        perWeek.forEach((count, w) => {
            map[w] = Math.max(map[w] || 0, count * LEGACY_DAY_SECONDS);
            active.add(w);
            if (count >= LEGACY_GOLDEN_DAYS) golden.add(w);
        });
        safeLocalStorageSetItem(WEEKLY_ACTIVITY_KEY, JSON.stringify(map));
        safeLocalStorageSetItem(ACTIVE_WEEKS_KEY, JSON.stringify([...active].sort()));
        safeLocalStorageSetItem(LEGACY_GOLDEN_KEY, JSON.stringify([...golden].sort()));
    }

    safeLocalStorageSetItem(HISTORY_BACKFILLED_KEY, 'true');
    markMindPowerDirty(true);
    window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));
    return true;
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
    // The account's own first day, when known: week 1 is the week it was made.
    const firstDay = typeof window === 'undefined' ? null : localStorage.getItem(FIRST_DAY_KEY);
    if (firstDay) keys.add(firstDay);
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
 * oldest first and numbered from 1, then FUTURE_WEEKS weeks ahead.
 */
export function streakWeeks(now: Date = new Date()): WeekCell[] {
    const map = readWeeklyActivity();
    const current = weekStart(now);
    const first = firstWeekStart(now);
    const elapsed = Math.round((current.getTime() - first.getTime()) / (7 * 24 * 3600 * 1000));
    const total = elapsed + 1 + FUTURE_WEEKS;
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
            ratio: isFuture ? 0 : weekGoldenRatio(key),
            score: score ? score.score : null,
            golden: !isFuture && isGoldenWeek(key),
            isRest: restWeeks.has(key),
            isCurrent: i === elapsed,
            isFuture,
        });
    }
    return cells;
}

// ---- The account record ----

/**
 * What this device contributes to the account, and what the account holds
 * for everyone. mindPowerRecord carries these to and from Firestore; nothing
 * in here knows about the network.
 *
 * Device parts add across devices (each device's seconds, marks and visits
 * were its own). Shared parts are account truths merged by rule: unions for
 * lists, earliest-wins for a week's first reading, latest-wins for its last,
 * element-wise max for a week that closed on more than one device.
 */
export interface DeviceRecord {
    days: DaysMap;
    health: HealthMap;
    visits: string[];
    practiceSeconds: number;
    weekSeconds: WeeklyMap;
    updatedAt: number;
}

export interface SharedRecord {
    baselines: BaselineMap;
    /** Finished songs, by id, with when. */
    completedSongs: Record<string, number>;
    forgottenSongs: string[];
    legacyGolden: string[];
    firstDay: string | null;
    activeWeeks: string[];
    communityWeeks: Record<string, number>;
    historyBackfilled: boolean;
    /**
     * The lifetime counters a device only learns by opening the tab that
     * rebuilds them (words and recordings from the songs, on Create; mastered
     * lessons from the course, on Learn). Carried here so a device that has not
     * opened those tabs yet shows the account's numbers rather than zeros —
     * Mind Power on a new phone read "0 words" beside a laptop that said 4,000.
     * A device adopts them only where it has nothing of its own; its own
     * rebuild stays the truth once it has one. `at` is when they were read.
     */
    craftTotals?: { words: number; recordingSeconds: number; at: number };
    completedLessons?: string[];
}

export function exportDeviceRecord(): DeviceRecord {
    const own = typeof window === 'undefined' ? '0' : localStorage.getItem('mep-practice-seconds') || '0';
    return {
        days: readOwnDays(),
        health: readOwnHealth(),
        visits: readOwnVisits(),
        practiceSeconds: parseInt(own, 10) || 0,
        weekSeconds: readOwnWeeklyActivity(),
        updatedAt: Date.now(),
    };
}

/**
 * The per-project detail behind a week is only needed while the week can
 * still change, and it is the bulk of the record; the account keeps it for
 * the current and previous week only. Older weeks travel as their final.
 */
function trimBaselines(baselines: BaselineMap, now: Date): BaselineMap {
    const current = weekKey(now);
    const previous = weekKey(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
    const out: BaselineMap = {};
    for (const [week, b] of Object.entries(baselines)) {
        if (week === current || week === previous) {
            out[week] = b;
            continue;
        }
        const strip = (s: Snapshot): Snapshot => {
            const { projects: _projects, ...rest } = s;
            return rest;
        };
        out[week] = {
            start: strip(b.start),
            latest: strip(b.latest),
            startedAt: b.startedAt,
            latestAt: b.latestAt,
            final: b.final ?? craftBetween(b.start, b.latest),
        };
    }
    return out;
}

export function exportSharedRecord(now: Date = new Date()): SharedRecord {
    const dates = readJson<Record<string, number>>('mep-completed-song-dates', {});
    const completedSongs: Record<string, number> = {};
    for (const id of readIds('mep-completed-songs')) {
        completedSongs[id] = typeof dates[id] === 'number' ? dates[id] : 0;
    }
    // Only what this device has actually rebuilt goes up; an absent counter is
    // unknown here, not zero, and must not overwrite a device that knows.
    const absent = absentCraftKeys();
    const record: SharedRecord = {
        baselines: trimBaselines(readBaselines(), now),
        completedSongs,
        forgottenSongs: readIds(FORGOTTEN_SONGS_KEY),
        legacyGolden: readLegacyGolden(),
        firstDay: typeof window === 'undefined' ? null : localStorage.getItem(FIRST_DAY_KEY),
        activeWeeks: readJson<string[]>(ACTIVE_WEEKS_KEY, []),
        communityWeeks: readCommunityWeeks(),
        historyBackfilled: typeof window !== 'undefined' && !!localStorage.getItem(HISTORY_BACKFILLED_KEY),
    };
    if (typeof window !== 'undefined' && !absent.has('words') && !absent.has('recordingSeconds')) {
        record.craftTotals = {
            words: parseInt(localStorage.getItem('mep-create-words-typed') || '0', 10) || 0,
            recordingSeconds: parseInt(localStorage.getItem('mep-create-recording-seconds') || '0', 10) || 0,
            at: now.getTime(),
        };
    }
    if (!absent.has('chapters')) record.completedLessons = readIds('mep-completed-lessons');
    return record;
}

/** A week's Monday as epoch ms: the earliest a reading of it could have been taken. */
function weekEpoch(week: string): number {
    return parseKey(week)?.getTime() ?? 0;
}

function maxCounters(a: CraftCounters, b: CraftCounters): CraftCounters {
    return {
        words: Math.max(a.words, b.words),
        recordingSeconds: Math.max(a.recordingSeconds, b.recordingSeconds),
        sections: Math.max(a.sections, b.sections),
        chapters: Math.max(a.chapters, b.chapters),
        practiceSeconds: Math.max(a.practiceSeconds, b.practiceSeconds),
    };
}

/**
 * The preferred reading, with the counters it never had taken from the other.
 * A device that has not opened Create knows nothing about words; the reading
 * from the device that has is the truth for those, whatever the clock says.
 */
function mergeSnapshot(preferred: Snapshot, other: Snapshot): Snapshot {
    const mine = new Set(preferred.absent || []);
    const theirs = new Set(other.absent || []);
    if (mine.size === 0) return preferred;
    const out: Snapshot = { ...preferred };
    for (const key of mine) {
        if (theirs.has(key)) continue;
        if (key === 'projects') {
            if (other.projects) out.projects = other.projects;
        } else if (key === 'chapters') {
            out.chapters = other.chapters;
            if (other.chapterIds) out.chapterIds = other.chapterIds;
            else delete out.chapterIds;
        } else {
            out[key] = other[key];
        }
    }
    const still = [...mine].filter(k => theirs.has(k)).sort();
    if (still.length > 0) out.absent = still;
    else delete out.absent;
    return out;
}

/** One week's baseline from two devices: the earlier start, the later latest, the fuller final. */
function mergeBaseline(local: CraftBaseline | undefined, remote: CraftBaseline, week: string): CraftBaseline {
    if (!local) return remote;
    const stamp = (b: CraftBaseline, key: 'startedAt' | 'latestAt') => b[key] ?? weekEpoch(week);
    const startFrom = stamp(remote, 'startedAt') < stamp(local, 'startedAt') ? remote : local;
    const startOther = startFrom === remote ? local : remote;
    const latestFrom = stamp(remote, 'latestAt') > stamp(local, 'latestAt') ? remote : local;
    const latestOther = latestFrom === remote ? local : remote;
    const merged: CraftBaseline = {
        start: mergeSnapshot(startFrom.start, startOther.start),
        latest: mergeSnapshot(latestFrom.latest, latestOther.latest),
        startedAt: startFrom.startedAt ?? local.startedAt ?? remote.startedAt,
        latestAt: latestFrom.latestAt ?? local.latestAt ?? remote.latestAt,
    };
    if (local.final && remote.final) merged.final = maxCounters(local.final, remote.final);
    else if (local.final || remote.final) merged.final = local.final ?? remote.final;
    return merged;
}

/**
 * Fold the account's shared parts into this device. Returns whether anything
 * here changed, so the caller can announce it, and only then.
 */
export function mergeSharedRecord(remote: Partial<SharedRecord>): boolean {
    if (typeof window === 'undefined') return false;
    let changed = false;
    const write = (key: string, value: unknown) => {
        const next = JSON.stringify(value);
        if ((localStorage.getItem(key) || '') !== next) {
            safeLocalStorageSetItem(key, next);
            changed = true;
        }
    };
    const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

    if (remote.baselines && typeof remote.baselines === 'object') {
        const local = readBaselines();
        const merged: BaselineMap = { ...local };
        for (const [week, b] of Object.entries(remote.baselines)) {
            if (!b || !b.start || !b.latest) continue;
            merged[week] = mergeBaseline(local[week], b, week);
        }
        write(CRAFT_BASELINE_KEY, merged);
    }

    const forgotten = new Set([...readIds(FORGOTTEN_SONGS_KEY), ...strings(remote.forgottenSongs)]);
    if (forgotten.size > 0) write(FORGOTTEN_SONGS_KEY, [...forgotten].sort());

    if (remote.completedSongs && typeof remote.completedSongs === 'object') {
        const dates = readJson<Record<string, number>>('mep-completed-song-dates', {});
        const ids = new Set(readIds('mep-completed-songs'));
        for (const [id, at] of Object.entries(remote.completedSongs)) {
            if (forgotten.has(id)) continue;
            ids.add(id);
            if (typeof at === 'number' && at > 0 && (typeof dates[id] !== 'number' || at < dates[id])) dates[id] = at;
        }
        for (const id of forgotten) {
            ids.delete(id);
            delete dates[id];
        }
        write('mep-completed-songs', [...ids]);
        write('mep-completed-song-dates', dates);
    }

    if (Array.isArray(remote.legacyGolden)) {
        write(LEGACY_GOLDEN_KEY, [...new Set([...readLegacyGolden(), ...strings(remote.legacyGolden)])].sort());
    }

    if (Array.isArray(remote.activeWeeks)) {
        write(ACTIVE_WEEKS_KEY, [...new Set([...readJson<string[]>(ACTIVE_WEEKS_KEY, []), ...strings(remote.activeWeeks)])].sort());
    }

    if (typeof remote.firstDay === 'string' && remote.firstDay) {
        const local = localStorage.getItem(FIRST_DAY_KEY);
        if (!local || remote.firstDay < local) {
            safeLocalStorageSetItem(FIRST_DAY_KEY, remote.firstDay);
            changed = true;
        }
    }

    if (remote.communityWeeks && typeof remote.communityWeeks === 'object') {
        // Closed weeks keep their number; only a week with none yet is filled.
        const local = readCommunityWeeks();
        let filled = false;
        for (const [week, n] of Object.entries(remote.communityWeeks)) {
            if (typeof n === 'number' && !(week in local)) {
                local[week] = n;
                filled = true;
            }
        }
        if (filled) write(COMMUNITY_WEEKS_KEY, local);
    }

    // Lifetime counters this device has never rebuilt: take the account's, so
    // Mind Power reads the same here as on the device that did. A device with
    // its own reading keeps it — that reading came from the songs themselves.
    {
        const absent = absentCraftKeys();
        const totals = remote.craftTotals;
        if (totals && typeof totals === 'object') {
            if (absent.has('words') && typeof totals.words === 'number') {
                safeLocalStorageSetItem('mep-create-words-typed', String(Math.max(0, Math.round(totals.words))));
                changed = true;
            }
            if (absent.has('recordingSeconds') && typeof totals.recordingSeconds === 'number') {
                safeLocalStorageSetItem('mep-create-recording-seconds', String(Math.max(0, Math.round(totals.recordingSeconds))));
                changed = true;
            }
        }
        if (absent.has('chapters') && Array.isArray(remote.completedLessons)) {
            write('mep-completed-lessons', strings(remote.completedLessons));
        }
    }

    if (remote.historyBackfilled && !localStorage.getItem(HISTORY_BACKFILLED_KEY)) {
        safeLocalStorageSetItem(HISTORY_BACKFILLED_KEY, 'true');
        changed = true;
    }

    return changed;
}

/** Sum the other devices' records into the shape the readers add in. */
export function sumDeviceRecords(records: DeviceRecord[]): OthersRecord {
    const out: OthersRecord = { days: {}, health: {}, visits: [], practiceSeconds: 0, weekSeconds: {} };
    const visits = new Set<string>();
    for (const r of records) {
        for (const [week, days] of Object.entries(r.days || {})) {
            const target = out.days[week] || (out.days[week] = {});
            for (const [day, s] of Object.entries(days)) target[day] = (target[day] || 0) + (s || 0);
        }
        for (const [day, marks] of Object.entries(r.health || {})) {
            const target = out.health[day] || (out.health[day] = {});
            for (const [kind, n] of Object.entries(marks) as [HealthMark, number][]) target[kind] = (target[kind] || 0) + (n || 0);
        }
        for (const v of r.visits || []) visits.add(v);
        out.practiceSeconds += r.practiceSeconds || 0;
        for (const [week, s] of Object.entries(r.weekSeconds || {})) out.weekSeconds[week] = Math.max(out.weekSeconds[week] || 0, s || 0);
    }
    out.visits = [...visits].sort();
    return out;
}
