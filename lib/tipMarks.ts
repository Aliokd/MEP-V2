"use client";

import React from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeLocalStorageSetItem } from '@/lib/storage';

/**
 * Which tips the writer has favourited or ticked off.
 *
 * Keyed by the tip's id in the Bank — NOT by the id of a placed canvas card —
 * so the mark belongs to the tip itself. Favouriting in Learn shows on every
 * copy of that tip sitting on a canvas, and ticking one on the canvas shows in
 * the Bank. Two cards of the same tip stay in step for the same reason.
 *
 * Storage is two-layered:
 *  - localStorage (uid-scoped, like the note cache) is the synchronous source
 *    every mounted card reads from — marks appear instantly on click.
 *  - users/{uid}.tipMarks in Firestore is the durable copy: every toggle
 *    writes through, and the first mount per session pulls the remote set and
 *    union-merges it in, so marks follow the account onto a new device or a
 *    cleared browser. Union on purpose: a mark should never silently vanish,
 *    which is the failure mode remote-wins would have whenever a write-through
 *    hadn't landed.
 */
export type TipMarkKind = 'liked' | 'checked';

export interface TipMarks {
    liked: string[];
    checked: string[];
}

const EMPTY: TipMarks = { liked: [], checked: [] };

/** Fired on every change so all mounted cards re-read together. */
export const TIP_MARKS_EVENT = 'veinote-tip-marks-updated';

const storageKey = (uid?: string | null) =>
    uid ? `veinote-tip-marks-${uid}` : 'veinote-tip-marks';

function parse(raw: string): TipMarks {
    if (!raw) return EMPTY;
    try {
        const parsed = JSON.parse(raw);
        const list = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
        return { liked: list(parsed?.liked), checked: list(parsed?.checked) };
    } catch {
        return EMPTY;
    }
}

// getSnapshot must return a referentially stable value or useSyncExternalStore
// re-renders forever, so the parsed result is cached against the raw string it
// came from and only rebuilt when that string actually changes.
let cachedKey: string | null = null;
let cachedRaw: string | null = null;
let cachedValue: TipMarks = EMPTY;

function getSnapshot(uid?: string | null): TipMarks {
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
    // `storage` covers the same account open in another tab; the custom event
    // covers this one, which `storage` deliberately does not fire for.
    window.addEventListener(TIP_MARKS_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(TIP_MARKS_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

export function readTipMarks(uid?: string | null): TipMarks {
    return getSnapshot(uid);
}

/** Toggles one mark and returns whether it is now set. */
export function toggleTipMark(kind: TipMarkKind, sourceId: string, uid?: string | null): boolean {
    if (typeof window === 'undefined' || !sourceId) return false;
    const current = getSnapshot(uid);
    const list = current[kind];
    const has = list.includes(sourceId);
    const next: TipMarks = {
        ...current,
        [kind]: has ? list.filter(id => id !== sourceId) : [...list, sourceId],
    };
    safeLocalStorageSetItem(storageKey(uid), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(TIP_MARKS_EVENT));
    // Write-through to the account. Fire-and-forget: the UI has already moved,
    // and a failed write costs nothing locally — the next toggle pushes the
    // full current lists again, healing the gap.
    if (uid) {
        setDoc(doc(db, 'users', uid), { tipMarks: next }, { merge: true })
            .catch(err => console.warn('[tipMarks] Could not persist to Firestore:', err));
    }
    return !has;
}

/**
 * One pull per uid per session: union-merge the account's remote marks into
 * this browser, so favourites made on another device show here too. Union only
 * ever adds, which is why "same lengths" is enough to detect "nothing new".
 */
let pulledForUid: string | null = null;
async function pullRemoteTipMarks(uid: string): Promise<void> {
    if (pulledForUid === uid) return;
    pulledForUid = uid;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const remote = snap.exists()
            ? (snap.data().tipMarks as Partial<TipMarks> | undefined)
            : undefined;
        if (!remote) return;
        const union = (local: string[], incoming: unknown) => {
            const clean = Array.isArray(incoming)
                ? incoming.filter((x): x is string => typeof x === 'string')
                : [];
            return Array.from(new Set([...local, ...clean]));
        };
        const local = getSnapshot(uid);
        const merged: TipMarks = {
            liked: union(local.liked, remote.liked),
            checked: union(local.checked, remote.checked),
        };
        if (
            merged.liked.length === local.liked.length &&
            merged.checked.length === local.checked.length
        ) return;
        safeLocalStorageSetItem(storageKey(uid), JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(TIP_MARKS_EVENT));
    } catch {
        // Offline or rules hiccup — let a later mount try again.
        pulledForUid = null;
    }
}

/** Live view of the marks, as sets, re-rendering whenever they change. */
export function useTipMarks(uid?: string | null): { liked: Set<string>; checked: Set<string> } {
    const marks = React.useSyncExternalStore(
        subscribe,
        () => getSnapshot(uid),
        () => EMPTY,
    );
    // Bring the account's marks down once per session; the event it fires on
    // arrival re-renders every mounted card through the store subscription.
    React.useEffect(() => {
        if (uid) void pullRemoteTipMarks(uid);
    }, [uid]);
    return React.useMemo(
        () => ({ liked: new Set(marks.liked), checked: new Set(marks.checked) }),
        [marks],
    );
}
