import { useRef, useState } from 'react';

/**
 * Swipe a bottom sheet down to dismiss it.
 *
 * Spread `swipeHandlers` and `swipeStyle` onto the sheet's PANEL element — the
 * one carrying `.sheet-panel`. The panel follows the finger while it is dragged,
 * so the gesture is answered rather than merely detected, and commits past a
 * threshold: either far enough, or a short fast flick, because a quick flick
 * reads as just as deliberate as a long slow drag. Anything less springs back.
 *
 * Three things it deliberately does NOT do:
 *
 *   - Fire for a mouse. A pointer drag on a desktop dialog is a text selection,
 *     not a dismissal, and these panels are only sheets below md anyway — which
 *     the media query below matches to the `.sheet-panel` CSS.
 *
 *   - Steal a scroll. A downward drag inside content that is scrolled belongs to
 *     that content. The check walks from the event's target up to the panel, so
 *     it holds whether the panel scrolls itself or delegates to an inner
 *     `.sheet-panel-body` — both shapes exist among these sheets.
 *
 *   - Steal a drag from a control that wants one: text fields, selects and
 *     anything marked `data-no-sheet-drag` (sliders, canvases, carousels).
 *
 * No `setPointerCapture` here, unlike the studio's own sheet: capturing the
 * pointer on an element that is also the scroller cancels its native scrolling.
 * `onPointerCancel` covers the finger leaving the element instead.
 */

/** Committed if dragged past this many pixels... */
const DISTANCE_THRESHOLD = 110;
/** ...or flicked at least this fast (px/ms), having moved at least a little. */
const VELOCITY_THRESHOLD = 0.5;
const FLICK_MIN_DISTANCE = 24;

const DRAG_EXEMPT_SELECTOR =
    'input, textarea, select, [contenteditable="true"], [data-no-sheet-drag]';

/** True when anything between `from` and `stop` (inclusive) is scrolled down. */
function withinScrolledRegion(from: HTMLElement | null, stop: HTMLElement) {
    let node: HTMLElement | null = from;
    while (node) {
        if (node.scrollTop > 0) return true;
        if (node === stop) return false;
        node = node.parentElement;
    }
    return false;
}

/**
 * @param maxWidth The widest viewport at which this surface is still a SHEET.
 *   Defaults to 767 — the breakpoint the `.sheet-panel` CSS uses. The Demo Studio
 *   keeps its phone layout up to lg, so its panel passes 1023 instead; without
 *   that it was a bottom sheet you could not swipe between 768 and 1024.
 */
export function useSheetSwipe(onDismiss: () => void, enabled = true, maxWidth = 767) {
    const startY = useRef<number | null>(null);
    const startedAt = useRef(0);
    const [dragY, setDragY] = useState(0);

    const reset = () => {
        startY.current = null;
        setDragY(0);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        if (!enabled || e.pointerType === 'mouse') return;
        // Above the surface's own sheet range these are centred dialogs, where
        // there is no bottom edge to swipe towards.
        if (typeof window !== 'undefined' && window.matchMedia(`(min-width: ${maxWidth + 1}px)`).matches) return;

        const target = e.target as HTMLElement | null;
        if (target?.closest(DRAG_EXEMPT_SELECTOR)) return;
        if (withinScrolledRegion(target, e.currentTarget)) return;

        startY.current = e.clientY;
        startedAt.current = performance.now();
    };

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        if (startY.current === null) return;

        const distance = e.clientY - startY.current;
        // Upward only lifts the sheet off its edge, which it must not do.
        if (distance <= 0) {
            setDragY(0);
            return;
        }
        // The content started scrolling mid-gesture — hand it back.
        if (withinScrolledRegion(e.target as HTMLElement | null, e.currentTarget)) {
            reset();
            return;
        }
        setDragY(distance);
    };

    const onPointerUp = () => {
        if (startY.current === null) return;
        const distance = dragY;
        const velocity = distance / Math.max(1, performance.now() - startedAt.current);
        reset();
        if (distance > DISTANCE_THRESHOLD || (distance > FLICK_MIN_DISTANCE && velocity > VELOCITY_THRESHOLD)) {
            onDismiss();
        }
    };

    return {
        swipeHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
        },
        /** Undefined at rest, so the panel keeps whatever transform its CSS gives it. */
        swipeStyle: dragY > 0
            ? ({ transform: `translateY(${dragY}px)`, transition: 'none' } as React.CSSProperties)
            : undefined,
    };
}
