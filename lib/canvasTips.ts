"use client";

import { safeLocalStorageSetItem } from '@/lib/storage';

/**
 * A tip from Learn > Bank of tips, placed on the Create canvas.
 *
 * Kept structurally close to `Idea` in app/platform/data/ideas.ts, but with its
 * own id: the same tip can be sent to the canvas more than once, and each placed
 * card needs to be addressable (and deletable) on its own.
 */
export interface CanvasTip {
    id: string;
    /** The tip's id in the Bank, kept so a placed card can be traced back. */
    sourceId: string;
    title: string;
    description: string;
    whyItHelps?: string;
    example?: string;
    /** Placeholder phrase that holds this card's slot in the lyric flow. */
    phraseId?: string | null;
}

/**
 * Hand-off slot for "Send to canvas".
 *
 * Learn and Create are separate routes, so the tip travels through storage
 * rather than props. Scoped by uid for the same reason the note cache is — an
 * unscoped key would carry one account's pending tip into the next account that
 * signs in on this browser.
 */
const pendingKey = (uid?: string | null) =>
    uid ? `veinote-pending-canvas-tip-${uid}` : 'veinote-pending-canvas-tip';

export function stashTipForCanvas(tip: CanvasTip, uid?: string | null): boolean {
    return safeLocalStorageSetItem(pendingKey(uid), JSON.stringify(tip));
}

/**
 * Is a tip waiting? Deliberately separate from taking it: the canvas has to know
 * a hand-off is pending *before* it has somewhere to put it, and consuming the
 * slot at that point would drop the tip on the floor.
 */
export function hasPendingCanvasTip(uid?: string | null): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(pendingKey(uid)) !== null;
    } catch {
        return false;
    }
}

/**
 * Reads the pending tip and clears it in the same breath — this is a one-shot
 * hand-off, and a tip left behind would be re-placed on every later visit to the
 * canvas.
 */
export function takePendingCanvasTip(uid?: string | null): CanvasTip | null {
    if (typeof window === 'undefined') return null;
    const key = pendingKey(uid);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        localStorage.removeItem(key);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.title !== 'string') return null;
        return parsed as CanvasTip;
    } catch {
        // A corrupt hand-off is not worth keeping around to fail again.
        try { localStorage.removeItem(key); } catch { /* ignore */ }
        return null;
    }
}
