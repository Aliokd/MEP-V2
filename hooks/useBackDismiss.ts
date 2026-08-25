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
 *   closing  → (scrim, X, Escape) pop our own entry so it doesn't linger and
 *              swallow the NEXT Back press
 *
 * The URL is deliberately unchanged — `pushState` is called with the current
 * href — so the router sees no navigation and nothing re-renders. The entry
 * exists purely to be popped.
 */
export function useBackDismiss(isOpen: boolean, onClose: () => void) {
    // Held in a ref so a caller passing an inline arrow doesn't tear the history
    // entry down and rebuild it on every render.
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    // Whether the entry currently on top of the stack is ours to remove.
    const ownsEntryRef = useRef(false);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;

        // A token unique to THIS opening, so the cleanup can tell our own entry
        // apart from one pushed since — including one pushed by the router.
        const token = `${Date.now()}-${Math.round(performance.now())}`;
        const hrefAtPush = window.location.href;

        window.history.pushState({ __overlay: token }, '', hrefAtPush);
        ownsEntryRef.current = true;

        const handlePop = () => {
            // The browser has already removed our entry by the time this fires,
            // so there is nothing left for the cleanup below to pop.
            ownsEntryRef.current = false;
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePop);

        return () => {
            window.removeEventListener('popstate', handlePop);
            if (!ownsEntryRef.current) return;
            ownsEntryRef.current = false;

            /*
             * Closed by the scrim, the X or Escape: our entry is still on the
             * stack and would otherwise eat the next Back press as a no-op.
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
                if (stillOurs && sameUrl) window.history.back();
            }, 0);
        };
    }, [isOpen]);
}
