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
 * So each open overlay gets a history entry of its own, pushed at the current
 * href — the URL never changes, the router sees no navigation, and the entry
 * exists purely to be popped.
 *
 * ── Nesting ─────────────────────────────────────────────────────────────────
 *
 * Overlays stack: a sheet opens on top of the tools panel, which is itself an
 * overlay. `popstate` has no target — it fires on window and every listener
 * hears it — so each instance checks the shared stack and only the top one
 * answers. One Back press, one level.
 *
 * ── Why closing never calls history.back() ──────────────────────────────────
 *
 * A closing overlay's entry is still on the stack and would eat the next Back
 * press as a no-op, so the obvious move is to pop it. That is what this hook
 * used to do, deferred a tick and guarded on the URL being unchanged, and it
 * broke navigation twice.
 *
 * The reason is Next's App Router. A `Link` click inside an overlay does two
 * things at once: it closes the overlay and it navigates. But `router.push`
 * only reaches `history.pushState` once the RSC payload for the new route has
 * resolved — which is later than any `setTimeout` we can schedule. So the guard
 * looked at an unchanged URL, concluded no navigation was happening, and called
 * `history.back()`. The router listens for `popstate` too, took ours for the
 * user pressing Back, and restored the route it was in the middle of leaving.
 * The tab click did nothing at all.
 *
 * No timing guard can fix that, because the thing being guarded against has not
 * happened yet at guard time. So this hook does not touch history on close at
 * all. Instead the entry is ORPHANED — left in place, remembered — and the next
 * overlay to open at the same URL ADOPTS it via `replaceState` rather than
 * pushing another. `replaceState` does not navigate and fires no popstate.
 *
 * Net effect: entries don't accumulate across open/close cycles, and the only
 * cost is one dead Back press if the user closes an overlay by scrim and then
 * presses Back without opening anything else. A wasted Back press is a much
 * smaller failure than a nav link that silently does nothing.
 */

type OverlayEntry = { token: string; close: () => void };

/** Open overlays, oldest first. The last element is the one Back should close. */
const overlayStack: OverlayEntry[] = [];

/**
 * An entry left behind by an overlay that closed without Back being pressed.
 * Held with the href it was pushed at, because after a route change the router
 * has stacked its own entry on top of it and it is no longer ours to reuse.
 */
let orphanedEntryHref: string | null = null;

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

        // Reuse the entry the last overlay left behind when it is still the top
        // of the stack and still at this URL; otherwise add one. Adoption is a
        // replaceState — same position in history, new owner — which neither
        // navigates nor fires popstate.
        const canAdopt =
            overlayStack.length === 0 &&
            orphanedEntryHref === hrefAtPush &&
            (window.history.state as { __overlay?: string } | null)?.__overlay != null;

        if (canAdopt) {
            orphanedEntryHref = null;
            window.history.replaceState({ __overlay: token }, '', hrefAtPush);
        } else {
            window.history.pushState({ __overlay: token }, '', hrefAtPush);
        }

        overlayStack.push({ token, close: () => onCloseRef.current() });

        const handlePop = () => {
            // Every open overlay has a listener and they all hear every popstate,
            // so each asks "is this mine to answer?" — only the top says yes.
            if (overlayStack[overlayStack.length - 1]?.token !== token) return;

            // The browser has removed this entry, so there is nothing to orphan
            // and nothing for the cleanup below to tidy up.
            overlayStack.pop();
            orphanedEntryHref = null;
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePop);

        return () => {
            window.removeEventListener('popstate', handlePop);

            const at = overlayStack.findIndex(e => e.token === token);
            if (at === -1) {
                // Already taken off the stack by handlePop — this close came FROM
                // Back, and the entry went with it.
                return;
            }
            overlayStack.splice(at, 1);

            // Closed by the scrim, a swipe, the X, Escape — or by a link that is
            // navigating right now. We cannot tell which, and must not guess: see
            // the note at the top of this file. Leave the entry alone and record
            // it, so the next overlay at this URL takes it over instead of adding
            // another. If a navigation IS in flight, the router stacks its entry
            // on top and the href check below stops the orphan being reused.
            if ((window.history.state as { __overlay?: string } | null)?.__overlay === token) {
                orphanedEntryHref = hrefAtPush;
            }
        };
    }, [isOpen]);
}
