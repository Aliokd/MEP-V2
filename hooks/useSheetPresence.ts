import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a conditionally-rendered element mounted long enough to play an exit
 * animation.
 *
 * `{cond && <Sheet />}` unmounts on the frame the flag flips, so an exit
 * keyframe never gets to run — which is why bottom sheets across the app slid
 * in but vanished on close. This holds `mounted` true for `durationMs` after
 * `isOpen` goes false and reports `closing` for exactly that window, so the
 * caller can swap .bottom-sheet-enter for .bottom-sheet-exit.
 *
 * `durationMs` must match the exit keyframe's duration (260ms for
 * .bottom-sheet-exit). Longer only delays the unmount; shorter cuts the
 * animation off partway.
 */
export function useSheetPresence(isOpen: boolean, durationMs = 260) {
    const [mounted, setMounted] = useState(isOpen);
    const [closing, setClosing] = useState(false);
    // Guards the close path on first render: without it a sheet that starts
    // closed would schedule an unmount for a sheet that was never mounted, and
    // set state during mount for nothing.
    const hasOpened = useRef(isOpen);

    useEffect(() => {
        if (isOpen) {
            hasOpened.current = true;
            setMounted(true);
            setClosing(false);
            return;
        }

        if (!hasOpened.current) return;
        hasOpened.current = false;

        setClosing(true);
        const id = setTimeout(() => {
            setMounted(false);
            setClosing(false);
        }, durationMs);

        return () => clearTimeout(id);
    }, [isOpen, durationMs]);

    return { mounted, closing };
}
