"use client";

import { useCallback, useState } from 'react';
import { haptic } from '@/lib/haptics';

/**
 * The onboarding's answer to a step someone tried to leave unfinished.
 *
 * A greyed-out button explains nothing: it says "not yet" without saying what
 * is missing. So the button stays live, and pressing it early shakes it once
 * and says what to do — the same amount of information, offered at the moment
 * it was asked for.
 *
 * The onboarding writes this inline, twice, in two different ways. Practice has
 * six steps that need it and more practices coming, so it lives here instead.
 *
 * Counter rather than a flag: the shake has to replay on the second and third
 * press, and re-adding a class to an element that never lost it is not a change
 * the animation engine replays. The count is what remounts the button.
 */
export function useNudge() {
    const [count, setCount] = useState(0);

    /** Something is missing — shake, buzz, and put the message on screen. */
    const nudge = useCallback(() => {
        setCount(n => n + 1);
        // Onboarding is visual-only; a phone can feel this one.
        // haptic() already stands down for reduced-motion and for iOS.
        haptic('warning');
    }, []);

    /** The prompt has been answered, so stop asking. */
    const clear = useCallback(() => setCount(0), []);

    /*
     * Put both on the button that was pressed. The key is what restarts the
     * animation — it remounts the element, and re-adding a class to an element
     * that never lost it is not a change the engine replays. Passed as two
     * values rather than one spreadable object because React 19 warns when a
     * `key` arrives through a spread.
     */
    return {
        count,
        nudge,
        clear,
        /** For `key=` on the button. */
        shakeKey: `nudge-${count}`,
        /** For its className. Global class, defined in globals.css. */
        shakeClass: count > 0 ? 'animate-nudge-shake' : '',
    };
}
