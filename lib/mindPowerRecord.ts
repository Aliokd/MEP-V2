"use client";

import { doc, onSnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { safeLocalStorageSetItem } from './storage';
import {
    MIND_POWER_DIRTY_EVENT,
    WEEKLY_ACTIVITY_EVENT,
    applyOthers,
    exportDeviceRecord,
    exportSharedRecord,
    mergeSharedRecord,
    recordVisit,
    sumDeviceRecords,
    type DeviceRecord,
    type SharedRecord,
} from './weeklyActivity';

/**
 * The Mind Power record, carried between the account's devices.
 *
 * Every device keeps its own record in localStorage and reads instantly from
 * it. This module keeps one document per account, users/{uid}/mindPower/record,
 * holding each device's contribution under its own id and the account's shared
 * truths beside them. A device writes only its own slot and the shared parts,
 * with a merge, so two devices writing at once cannot clobber each other; every
 * device listens to the document and folds the *other* devices' slots into what
 * it reads. The result is that a week scores the same on the phone and the
 * laptop, which it did not when the phone's evenings lived only on the phone.
 *
 * Writes are the cost that matters, so ticks are batched: a change waits up to
 * FLUSH_MS before it is sent, a discrete act (a breathing session, a finished
 * song) goes within URGENT_MS, and leaving the page sends whatever is pending.
 * An unchanged record is never re-sent.
 */

const DEVICE_ID_KEY = 'mep-device-id';
const FLUSH_MS = 3 * 60 * 1000;
const URGENT_MS = 2 * 1000;

interface RecordDoc extends DocumentData {
    v: number;
    devices?: Record<string, DeviceRecord>;
    shared?: Partial<SharedRecord>;
}

/** This browser's id — the device, not the account, so it must not be purged on sign-out. */
export function deviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        safeLocalStorageSetItem(DEVICE_ID_KEY, id);
    }
    return id;
}

/**
 * Start carrying the record for this account. Returns a stop function; call it
 * on sign-out or unmount. Idempotent per uid within a session.
 */
export function startMindPowerSync(uid: string): () => void {
    if (typeof window === 'undefined') return () => {};
    const me = deviceId();
    const ref = doc(db, 'users', uid, 'mindPower', 'record');

    let timer: number | null = null;
    let dirty = false;
    let lastPushed = '';
    let stopped = false;

    const push = async () => {
        if (stopped) return;
        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
        dirty = false;
        const payload = {
            v: 1,
            devices: { [me]: exportDeviceRecord() },
            shared: exportSharedRecord(),
        };
        // updatedAt moves every time; compare the rest so a silent tick costs nothing.
        const fingerprint = JSON.stringify({ ...payload, devices: { [me]: { ...payload.devices[me], updatedAt: 0 } } });
        if (fingerprint === lastPushed) return;
        try {
            await setDoc(ref, payload, { merge: true });
            lastPushed = fingerprint;
        } catch (err) {
            console.warn('[mindPower] Could not save the record:', err);
            dirty = true;
        }
    };

    const onDirty = (e: Event) => {
        const urgent = !!(e as CustomEvent<{ urgent?: boolean }>).detail?.urgent;
        dirty = true;
        const wait = urgent ? URGENT_MS : FLUSH_MS;
        if (timer !== null) {
            if (!urgent) return;
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => void push(), wait);
    };

    const onHide = () => {
        if (document.visibilityState === 'hidden' && dirty) void push();
    };

    window.addEventListener(MIND_POWER_DIRTY_EVENT, onDirty);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    const unsubscribe = onSnapshot(
        ref,
        snap => {
            if (stopped) return;
            const data = (snap.exists() ? snap.data() : {}) as RecordDoc;
            const others = Object.entries(data.devices || {})
                .filter(([id]) => id !== me)
                .map(([, r]) => r);
            let changed = applyOthers(sumDeviceRecords(others));
            if (data.shared && mergeSharedRecord(data.shared)) changed = true;
            if (changed) {
                // Re-read the counters against the merged record, then let the
                // page redraw. recordVisit announces a moved reading itself.
                recordVisit();
                window.dispatchEvent(new CustomEvent(WEEKLY_ACTIVITY_EVENT));
            }
            // First contact: make sure this device's share is on the account.
            if (!snap.exists() || !data.devices?.[me]) {
                dirty = true;
                if (timer === null) timer = window.setTimeout(() => void push(), URGENT_MS);
            }
        },
        err => console.warn('[mindPower] Could not read the record:', err),
    );

    return () => {
        stopped = true;
        unsubscribe();
        window.removeEventListener(MIND_POWER_DIRTY_EVENT, onDirty);
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', onHide);
        if (timer !== null) window.clearTimeout(timer);
    };
}
