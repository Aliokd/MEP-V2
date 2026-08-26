import { useEffect, useRef } from 'react';

/**
 * Makes the hardware/browser Back button close an overlay instead of navigating.
 *
 * On Android, Back is the universal "get me out of this" gesture — people use it
 * to dismiss menus and sheets the way they'd tap a scrim. But a menu is not a
 * history entry, so the browser has nothing to go back to except the previous
 * PAGE. From /platform/create that walks the user out of the app, and because
 * the route they came from is usually /signin it reads as being logged out.
 *
 * The fix is to give the overlay a history entry of its own while it is open:
 *
 *   opening  → push an entry, so Back has something local to pop
 *   Back     → popstate fires, we close the overlay, the entry is already gone
 *   closing  → (scrim, swipe, X, Escape) pop our own entry so it doesn't linger
 *              and swallow the NEXT Back press
 *
 * The URL is deliberately unchanged — `pushState` is called with the current
 * href — so the router sees no navigation and nothing re-renders. The entry
 * exists purely to be popped.
 *
 * ── Why there is a module-level stack ────────────────────────────────────────
 *
 * Overlays nest: a sheet opens on top of the tools panel, which is itself an
 * overlay. Each one calls this hook, so each one has an entry and a listener.
 *
 * `popstate` has no target — it fires on window, and EVERY listener hears it.
 * So the closing step above was catastrophic when nested: dismissing the top
 * sheet popped its own entry, the resulting popstate reached the panel's
 * listener too, and the panel closed with it. Swiping a sheet down dropped the
 * user all the way back to the canvas instead of to the panel underneath.
 *
 * An explicit stack fixes both directions:
 *
 *   - a real Back press dismisses only the TOP overlay, one level per press
 *   - a self-inflicted pop (the cleanup above) is counted and swallowed, so no
 *     other overlay mistakes it for the user asking to leave
 *
 * The listener stays PER-INSTANCE, added and removed with the effect. A single
 * module-level listener looked tidier and broke navigation: it is registered
 * behind a module-level `listening` flag, and Fast Refresh re-evaluates the
 * module without unbinding, so the old closure stayed attached while the flag
 * reset — leaving two handlers racing over one counter. Binding per instance
 * ties the listener's life to the effect that owns it.
 */

type OverlayEntry = { token: string; close: () => void };

/** Open overlays, oldest first. The last element is the one Back should close. */
const overlayStack: OverlayEntry[] = [];

/**
 * How many popstate events are our own cleanup rather than the user.
 * A counter, not a boolean: two overlays can unmount in the same tick.
 */
let selfInflictedPops = 0;

export function useBackDismiss(isOpen: boolean, onClose: () => void) {
    // Held in a ref so a caller passing an inline arrow doesn't tear the history
    // entry down and rebuild it on every render.
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;

        // A token unique to THIS opening, so the cleanup can tell our own entry
        // apart from one pushed since — including one pushed by the router.
        const token = `${Date.now()}-${Math.round(performance.now())}-${overlayStack.length}`;
        const hrefAtPush = window.location.href;

        window.history.pushState({ __overlay: token }, '', hrefAtPush);
        overlayStack.push({ token, close: () => onCloseRef.current() });

        const handlePop = () => {
            // Order matters. Every open overlay has a listener and they all hear
            // every popstate, so each one first asks "is this mine to answer?" —
            // only the top of the stack says yes. Checking the self-pop counter
            // first would let whichever listener happened to run first consume it,
            // and the rest would sail past the guard.
            if (overlayStack[overlayStack.length - 1]?.token !== token) return;

            // A pop this hook caused itself (see the cleanup below), not the user
            // pressing Back. The overlay that caused it has already removed itself
            // from the stack, so the one asking here is its PARENT — which must
            // stay open. This is what stops dismissing a sheet from also closing
            // the panel underneath it.
            if (selfInflictedPops > 0) {
                selfInflictedPops--;
                return;
            }

            // One level per press. This overlay's own cleanup will find itself
            // already gone from the stack and skip re-popping the history entry,
            // which the browser has removed for us.
            overlayStack.pop();
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePop);

        return () => {
            window.removeEventListener('popstate', handlePop);

            const at = overlayStack.findIndex(e => e.token === token);
            if (at === -1) {
                // Already taken off the stack by handlePop — this close came FROM
                // Back, so the browser has removed the history entry too and there
                // is nothing left to undo.
                return;
            }
            overlayStack.splice(at, 1);

            /*
             * Closed by the scrim, a swipe, the X or Escape: our entry is still on
             * the stack and would otherwise eat the next Back press as a no-op.
             *
             * Deferred by a tick, and re-checked, because `history.back()` is
             * ASYNCHRONOUS — it queues a popstate rather than acting inline. A
             * nav link inside an overlay closes it and routes in the same click,
             * and calling back() synchronously there raced the router: the queued
             * pop landed *after* the new route was pushed and promptly undid it,
             * so the link appeared not to work at all. This is what made the
             * sidebar's tabs unclickable.
             *
             * By the next tick any client navigation has already pushed its own
             * entry, so both guards below fail and the pop is correctly skipped —
             * the stale entry is harmless once the route has changed anyway.
             */
            window.setTimeout(() => {
                const stillOurs = (window.history.state as { __overlay?: string } | null)?.__overlay === token;
                const sameUrl = window.location.href === hrefAtPush;
                if (stillOurs && sameUrl) {
                    // Claimed BEFORE the call: back() is async, but the counter has
                    // to be up by the time the event lands, and nothing else runs
                    // in between.
                    selfInflictedPops++;
                    window.history.back();
                }
            }, 0);
        };
    }, [isOpen]);
}
