"use client";

import { useEffect, useState } from 'react';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '@/lib/storage';

export type LyricSize = 'small' | 'medium' | 'large';
export const LYRIC_SIZES: LyricSize[] = ['small', 'medium', 'large'];
export const DEFAULT_LYRIC_SIZE: LyricSize = 'medium';

/**
 * How large lyrics are drawn on the Create canvas.
 *
 * Deliberately NOT uid-scoped: like the sidebar's collapsed state and the
 * language, this describes the screen someone is reading on, not their account
 * — a phone and a desktop should be free to disagree, and switching accounts on
 * one browser shouldn't reset it. See lib/storage.ts's ACCOUNT_SCOPED_KEYS for
 * the keys that do belong to an account.
 *
 * The value is applied as `data-lyric-size` on <html>, which drives the
 * `--lyric-scale` custom property behind the `.lyric-type` class in globals.css.
 * One attribute rather than per-element styles: the canvas draws lyrics in five
 * different places (line rows, the editing textarea, the placeholder, the
 * fullscreen writer) and they must never disagree about their own size.
 */
const KEY = 'veinote-lyric-size';

function isLyricSize(value: string | null): value is LyricSize {
    return value === 'small' || value === 'medium' || value === 'large';
}

export function readLyricSize(): LyricSize {
    const stored = safeLocalStorageGetItem(KEY);
    return isLyricSize(stored) ? stored : DEFAULT_LYRIC_SIZE;
}

/** Paints the choice. Safe to call before React has rendered anything. */
export function applyLyricSize(size: LyricSize): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.lyricSize = size;
}

export function storeLyricSize(size: LyricSize): void {
    safeLocalStorageSetItem(KEY, size);
    applyLyricSize(size);
}

/** Reads on mount (never during render — the server has no localStorage). */
export function useLyricSize(): [LyricSize, (size: LyricSize) => void] {
    const [size, setSize] = useState<LyricSize>(DEFAULT_LYRIC_SIZE);

    useEffect(() => {
        setSize(readLyricSize());
    }, []);

    const choose = (next: LyricSize) => {
        setSize(next);
        storeLyricSize(next);
    };

    return [size, choose];
}
