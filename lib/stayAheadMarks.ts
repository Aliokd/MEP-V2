"use client";

import React from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { recordHealthMark } from '@/lib/weeklyActivity';

/**
 * Which Stay ahead sessions the songwriter has marked complete.
 *
 * Kept the same way as tip marks, for the same reasons: localStorage,
 * uid-scoped, is what the sheet reads synchronously so a tick lands the moment
 * it is clicked, and users/{uid}.stayAheadDone is the durable copy that follows
 * the account to another device. Union on merge, never remote-wins: a session
 * someone finished should not un-finish because a write-through was in flight.
 *
 * Completing one also records a health mark for the day, which is what carries
 * it into the week's Mind Power score. Unticking does not take that mark back —
 * the session was still done, and a week's health should not be editable after
 * the fact by clicking a checkbox twice.
 */

const EMPTY: string[] = [];

/** Fired on every change so every mounted sheet re-reads together. */
export const STAY_AHEAD_MARKS_EVENT = 'veinote-stay-ahead-marks-updated';

const storageKey = (uid?: string | null) =>
    uid ? `veinote-stay-ahead-done-${uid}` : 'veinote-stay-ahead-done';

function parse(raw: string): string[] {
    if (!raw) return EMPTY;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : EMPTY;
    } catch {
        return EMPTY;
    }
}

// getSnapshot must return a referentially stable value or useSyncExternalStore
// re-renders forever, so the parsed list is cached against its raw string.
let cachedKey: string | null = null;
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function getSnapshot(uid?: string | null): string[] {
    if (typeof window === 'undefined') return EMPTY;
    const key = storageKey(uid);
    let raw = '';
    try {
        raw = localStorage.getItem(key) ?? '';
    } catch {
        return EMPTY;
    }
    if (key !== cachedKey || raw !== cachedRaw) {
        cachedKey = key;
        cachedRaw = raw;
        cachedValue = parse(raw);
    }
    return cachedValue;
}

function subscribe(onChange: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(STAY_AHEAD_MARKS_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(STAY_AHEAD_MARKS_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

/** Toggles one session's mark and returns whether it is now complete. */
export function toggleStayAheadDone(sessionId: string, uid?: string | null): boolean {
    if (typeof window === 'undefined' || !sessionId) return false;
    const current = getSnapshot(uid);
    const has = current.includes(sessionId);
    const next = has ? current.filter(id => id !== sessionId) : [...current, sessionId];
    safeLocalStorageSetItem(storageKey(uid), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(STAY_AHEAD_MARKS_EVENT));
    // Finishing one is a healthy day; see the note above on why unticking is not
    // the reverse of that.
    if (!has) recordHealthMark('session');
    if (uid) {
        setDoc(doc(db, 'users', uid), { stayAheadDone: next }, { merge: true })
            .catch(err => console.warn('[stayAhead] Could not persist to Firestore:', err));
    }
    return !has;
}

/** One pull per uid per session, union-merged into this browser. */
let pulledForUid: string | null = null;
async function pullRemote(uid: string): Promise<void> {
    if (pulledForUid === uid) return;
    pulledForUid = uid;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const remote = snap.exists() ? snap.data().stayAheadDone : undefined;
        const clean = Array.isArray(remote) ? remote.filter((x): x is string => typeof x === 'string') : [];
        if (clean.length === 0) return;
        const local = getSnapshot(uid);
        const merged = Array.from(new Set([...local, ...clean]));
        if (merged.length === local.length) return;
        safeLocalStorageSetItem(storageKey(uid), JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(STAY_AHEAD_MARKS_EVENT));
    } catch {
        // Offline or a rules hiccup: let a later mount try again.
        pulledForUid = null;
    }
}

/** Live view of the completed sessions, re-rendering whenever they change. */
export function useStayAheadDone(uid?: string | null): Set<string> {
    const done = React.useSyncExternalStore(
        subscribe,
        () => getSnapshot(uid),
        () => EMPTY,
    );
    React.useEffect(() => {
        if (uid) void pullRemote(uid);
    }, [uid]);
    return React.useMemo(() => new Set(done), [done]);
}
