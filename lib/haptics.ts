/**
 * Haptic feedback, where the platform actually offers it.
 *
 * The honest state of play:
 *
 * - **Android** (Chrome, Firefox, Samsung Internet, Edge): `navigator.vibrate`
 *   works. It needs the page to have been interacted with — sticky activation,
 *   which does not expire — so calling it from a real gesture handler is fine,
 *   including from a long-press `setTimeout` that a touchstart began.
 *
 * - **iOS/iPadOS Safari — and therefore EVERY browser on iOS, since they are all
 *   WebKit**: `navigator.vibrate` does not exist. Apple has never shipped the
 *   Vibration API. Every call here is a silent no-op on iPhone. There is a known
 *   community polyfill that fakes it by wrapping the DOM in a <label> and
 *   synthesising clicks on hidden switch inputs, but it is a click-simulation
 *   hack — in this app, where click handling is already delicate (the popover's
 *   composedPath outside-click test, the Complete button's mousedown
 *   preventDefault), that is a real regression risk and is deliberately NOT
 *   used here. See the note in the PR/summary if you want to revisit it.
 *
 * The one thing that DOES give native haptics on iOS with no hack is a genuine
 * `<input type="checkbox" switch>` — worth using for controls that really are
 * toggles, but it can't be synthesised for arbitrary buttons.
 *
 * So: this is an Android-only enhancement that degrades to nothing elsewhere.
 * Never make anything depend on it firing.
 */

/**
 * Semantic names rather than raw millisecond values, so the vocabulary stays
 * consistent as call sites multiply — durations are easy to drift when every
 * caller picks its own number.
 *
 * Keep these SHORT. Anything past ~30ms reads as a buzz rather than a tap, and
 * over-vibrating is worse than no haptics at all.
 */
const PATTERNS = {
    /** A light tick. Picking something up, a selection landing. */
    tap: 10,
    /** Slightly firmer. A drag actually starting, a mode changing. */
    select: 15,
    /** A deliberate, physical action beginning or ending — recording. */
    impact: 25,
    /** Two quick beats. Something finished successfully. */
    success: [12, 45, 20],
    /** Longer, heavier. Something was rejected or is locked. */
    warning: [25, 60, 25],
} as const;

export type HapticPattern = keyof typeof PATTERNS;

/**
 * Whether haptics will actually do anything here. Useful if you'd otherwise
 * show a visual confirmation only when the buzz can't stand in for it — but
 * prefer designing so the visual is always there and the haptic is a bonus.
 */
export function hapticsAvailable(): boolean {
    if (typeof navigator === 'undefined') return false;
    return typeof navigator.vibrate === 'function';
}

/**
 * Fire a haptic. Safe to call anywhere, including during SSR and on iOS.
 * Returns whether it actually fired, which is almost never worth checking.
 *
 * Call this from within a user gesture — a tap, a drag, a long-press timer the
 * user's own touch started. Firing on a timer or a network response with no
 * gesture behind it is both blocked by the browser and rude.
 */
export function haptic(pattern: HapticPattern = 'tap'): boolean {
    if (!hapticsAvailable()) return false;

    // prefers-reduced-motion is strictly about visual/vestibular motion, so this
    // is a slight stretch of its meaning — but it is the only standardised
    // "dial the physicality down" signal a browser gives us, and someone who set
    // it is far more likely to want a still phone than not. If this ever gets a
    // real in-app setting, read that here instead.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        return false;
    }

    try {
        // Chrome returns false when it declines (no user activation yet, page
        // hidden, cross-origin frame) rather than throwing. Firefox has thrown
        // on malformed patterns in the past, hence the catch.
        return navigator.vibrate(PATTERNS[pattern] as number | number[]);
    } catch {
        return false;
    }
}

/** Stop any vibration in progress. */
export function cancelHaptics(): void {
    if (!hapticsAvailable()) return;
    try {
        navigator.vibrate(0);
    } catch {
        // Nothing to do — cancelling is best-effort by definition.
    }
}
