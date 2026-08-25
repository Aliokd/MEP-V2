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

        window.history.pushState({ __overlay: Date.now() }, '', window.location.href);
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

            // Closed by something other than Back — the scrim, the X, Escape.
            // Our entry is still sitting on the stack, and left there it would
            // eat the user's next Back press as a no-op.
            //
            // The state check matters: if the overlay closed BECAUSE the app
            // navigated somewhere, the top entry is that new route, not ours,
            // and calling back() would undo a navigation the user asked for.
            if (ownsEntryRef.current && window.history.state?.__overlay) {
                ownsEntryRef.current = false;
                window.history.back();
            }
            ownsEntryRef.current = false;
        };
    }, [isOpen]);
}
