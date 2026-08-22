"use client";

import { useEffect, useState } from 'react';
import { FOUNDER_SPOTS_TAKEN } from './uiFlags';

/**
 * The founders counter, as the two surfaces that show it consume it.
 *
 * Starts at the static anchor — the number the campaign opened at, baked into
 * the bundle, correct within a page-load of the truth — and upgrades to the
 * live figure from GET /api/waitlist, which is that anchor plus every real
 * signup since the counter went live. A failed or slow fetch leaves the
 * anchor standing: the counter must never flash to nothing, and being a
 * minute behind is indistinguishable from being current.
 *
 * One fetch per mount, no polling. Nobody watches this number long enough for
 * it to move under them; what matters is that the NEXT visitor sees the seat
 * the last one took.
 */
export function useFounderSpots(): number {
    const [taken, setTaken] = useState(FOUNDER_SPOTS_TAKEN);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/waitlist')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data && typeof data.taken === 'number') {
                    setTaken(data.taken);
                }
            })
            .catch(() => { /* the anchor stands */ });
        return () => {
            cancelled = true;
        };
    }, []);

    return taken;
}
