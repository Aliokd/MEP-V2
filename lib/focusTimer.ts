"use client";

import { useSyncExternalStore } from 'react';
import { safeLocalStorageSetItem } from './storage';

/**
 * Focus timer — a countdown the user sets (default 30 min) and works against.
 *
 * Lives in a module-level store rather than React state because two separate places
 * render it: the Mind Power panel's timer row, and the badge in the header pill that
 * shows while a session is running. Both subscribe independently, so a 1s tick
 * re-renders only those two small nodes instead of the whole platform layout.
 *
 * Remaining time is always DERIVED from a wall-clock end timestamp, never accumulated
 * by the tick. Browsers throttle setInterval to roughly once per minute in background
 * tabs — and backgrounding the tab is the normal case for a focus session — so a
 * tick-counted timer would drift by minutes over a 30-minute run and would freeze
 * entirely across a reload.
 */

const K_DURATION = 'mep-focus-timer-duration';
const K_ENDS_AT = 'mep-focus-timer-ends-at';
const K_REMAINING = 'mep-focus-timer-remaining';
const K_RUNNING = 'mep-focus-timer-running';

export const FOCUS_PRESET_MINUTES = [15, 25, 30, 45];
export const DEFAULT_FOCUS_SECONDS = 30 * 60;

export interface FocusTimerState {
    /** Length the user picked, in seconds. */
    durationSeconds: number;
    /** Seconds left on the clock. */
    remainingSeconds: number;
    isRunning: boolean;
    /** Reached zero and is waiting to be reset. */
    isComplete: boolean;
    /** Nothing has been consumed yet — a full, untouched clock. */
    isPristine: boolean;
}

let durationSeconds = DEFAULT_FOCUS_SECONDS;
let pausedRemaining = DEFAULT_FOCUS_SECONDS;
let endsAt = 0;
let isRunning = false;
let hydrated = false;

const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function buildSnapshot(remainingSeconds: number): FocusTimerState {
    return Object.freeze({
        durationSeconds,
        remainingSeconds,
        isRunning,
        isComplete: remainingSeconds === 0,
        isPristine: !isRunning && remainingSeconds === durationSeconds,
    });
}

let snapshot: FocusTimerState = buildSnapshot(DEFAULT_FOCUS_SECONDS);

/** getServerSnapshot must return a stable reference, so keep one frozen default. */
const SERVER_SNAPSHOT: FocusTimerState = snapshot;

function readInt(key: string, fallback: number): number {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function liveRemaining(): number {
    if (!isRunning) return pausedRemaining;
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function publish(): void {
    const remainingSeconds = liveRemaining();
    if (
        snapshot.durationSeconds === durationSeconds &&
        snapshot.remainingSeconds === remainingSeconds &&
        snapshot.isRunning === isRunning
    ) {
        return;
    }
    snapshot = buildSnapshot(remainingSeconds);
    listeners.forEach(listener => listener());
}

function persist(): void {
    safeLocalStorageSetItem(K_DURATION, durationSeconds.toString());
    safeLocalStorageSetItem(K_RUNNING, isRunning.toString());
    if (isRunning) {
        safeLocalStorageSetItem(K_ENDS_AT, endsAt.toString());
    } else {
        safeLocalStorageSetItem(K_REMAINING, pausedRemaining.toString());
    }
}

function syncTicker(): void {
    const shouldTick = isRunning && listeners.size > 0;
    if (shouldTick && !ticker) {
        // Polls faster than 1s only so the readout lands promptly on each second
        // boundary; the value itself comes from the clock, not from the tick count.
        ticker = setInterval(() => {
            if (isRunning && liveRemaining() === 0) finish();
            else publish();
        }, 250);
    } else if (!shouldTick && ticker) {
        clearInterval(ticker);
        ticker = null;
    }
}

function finish(): void {
    isRunning = false;
    pausedRemaining = 0;
    endsAt = 0;
    persist();
    syncTicker();
    publish();
}

function hydrate(): void {
    if (hydrated || typeof window === 'undefined') return;
    hydrated = true;

    durationSeconds = readInt(K_DURATION, DEFAULT_FOCUS_SECONDS);

    if (localStorage.getItem(K_RUNNING) === 'true') {
        // A session was live when the page went away. The clock kept running, so
        // work out where it actually stands now rather than resuming where it paused.
        endsAt = readInt(K_ENDS_AT, 0);
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        if (remaining > 0) {
            isRunning = true;
        } else {
            isRunning = false;
            pausedRemaining = 0;
            endsAt = 0;
        }
    } else {
        pausedRemaining = readInt(K_REMAINING, durationSeconds);
    }

    persist();
    publish();
}

function subscribe(listener: () => void): () => void {
    hydrate();
    listeners.add(listener);
    syncTicker();
    return () => {
        listeners.delete(listener);
        syncTicker();
    };
}

function getSnapshot(): FocusTimerState {
    return snapshot;
}

function getServerSnapshot(): FocusTimerState {
    return SERVER_SNAPSHOT;
}

export function useFocusTimer(): FocusTimerState {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function startFocusTimer(): void {
    if (isRunning) return;
    // Resuming a partly-used clock keeps its remainder; a finished one starts over.
    const from = pausedRemaining > 0 ? pausedRemaining : durationSeconds;
    endsAt = Date.now() + from * 1000;
    isRunning = true;
    persist();
    syncTicker();
    publish();
}

export function pauseFocusTimer(): void {
    if (!isRunning) return;
    pausedRemaining = liveRemaining();
    isRunning = false;
    endsAt = 0;
    persist();
    syncTicker();
    publish();
}

export function toggleFocusTimer(): void {
    if (isRunning) pauseFocusTimer();
    else startFocusTimer();
}

export function resetFocusTimer(): void {
    isRunning = false;
    endsAt = 0;
    pausedRemaining = durationSeconds;
    persist();
    syncTicker();
    publish();
}

export function setFocusDuration(minutes: number): void {
    durationSeconds = Math.max(60, Math.round(minutes) * 60);
    isRunning = false;
    endsAt = 0;
    pausedRemaining = durationSeconds;
    persist();
    syncTicker();
    publish();
}

export function formatFocusTime(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
