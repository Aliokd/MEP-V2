"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight } from 'lucide-react';
import { useSheetPresence } from '@/hooks/useSheetPresence';
import { useBackDismiss } from '@/hooks/useBackDismiss';
import * as btn from '@/app/platform/components/buttonStyles';

interface StudioActionSheetProps {
    open: boolean;
    onClose: () => void;
    /** Still required when `hideHeader` is set — it becomes the dialog's aria-label. */
    title: string;
    /** Optional line under the title, for context the rows themselves don't carry. */
    subtitle?: string;
    children: React.ReactNode;
    /** Sheet height as a dvh fraction. Lyrics wants more than Settings does. */
    maxHeight?: string;
    /**
     * Drops the title / subtitle / close row, leaving just the grab handle.
     *
     * For sheets whose first row already names what they are — repeating it in a
     * header is a second label for one thing, and the close button competes with
     * the sheet's own primary action. The handle stays, both as the drag surface
     * and as the thing that says "this pulls down".
     */
    hideHeader?: boolean;
    /**
     * Pinned to the sheet's floor, outside the scrolling body.
     *
     * Not the same as a `sticky` child of the body: sticky pins to the SCROLLPORT,
     * which stops at the body's padding box, so the body's bottom padding stayed
     * visible underneath as a strip of dead white. A real flex sibling has nothing
     * below it, and owns the safe-area inset itself.
     */
    footer?: React.ReactNode;
}

/**
 * A titled bottom sheet for Demo Studio's phone layout.
 *
 * Portalled to <body> deliberately: the tools panel that contains the studio has
 * a `transform` on it (that is how the sheet itself slides up), and a transformed
 * ancestor becomes the containing block for `position: fixed` descendants. Left
 * in place, a `fixed inset-0` sheet sizes itself to the panel rather than the
 * viewport.
 *
 * Enter/exit motion comes from .bottom-sheet-enter / .bottom-sheet-exit in
 * app/globals.css — tailwindcss-animate is not installed here, so `animate-in`
 * and friends compile to nothing.
 */
export default function StudioActionSheet({
    open,
    onClose,
    title,
    subtitle,
    children,
    maxHeight = '78dvh',
    hideHeader = false,
    footer,
}: StudioActionSheetProps) {
    const { mounted, closing } = useSheetPresence(open);
    // Android's Back closes the sheet rather than leaving the page.
    useBackDismiss(open, onClose);
    const [canPortal, setCanPortal] = React.useState(false);

    React.useEffect(() => setCanPortal(true), []);

    /**
     * Swipe down to dismiss.
     *
     * The sheet follows the finger while it is dragged, so the gesture is
     * answered rather than merely detected, and commits past a threshold —
     * either far enough (120px) or fast enough (a flick), because a short quick
     * swipe reads as just as deliberate as a long slow one. Anything less
     * springs back.
     *
     * Bound to the header, not the whole sheet: the body scrolls, and a drag
     * that starts on a scrollable list belongs to that list.
     */
    const dragStartY = React.useRef<number | null>(null);
    const dragStartT = React.useRef(0);
    const [dragY, setDragY] = React.useState(0);

    const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        dragStartY.current = e.clientY;
        dragStartT.current = performance.now();
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragStartY.current === null) return;
        // Downward only — dragging up must not lift the sheet off its edge.
        setDragY(Math.max(0, e.clientY - dragStartY.current));
    };

    const onDragEnd = () => {
        if (dragStartY.current === null) return;
        const distance = dragY;
        const velocity = distance / Math.max(1, performance.now() - dragStartT.current);
        dragStartY.current = null;
        setDragY(0);
        if (distance > 120 || velocity > 0.5) onClose();
    };

    // Close on Escape — a phone keyboard can have one, and it costs nothing.
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!mounted || !canPortal) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[120] flex items-end justify-center bg-stone-900/55 backdrop-blur-md ${
                closing ? 'sheet-backdrop-exit' : 'sheet-backdrop-enter'
            }`}
            onClick={onClose}
        >
            <div
                className={`w-full bg-white rounded-t-[26px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden ${
                    closing ? 'bottom-sheet-exit pointer-events-none' : 'bottom-sheet-enter'
                }`}
                style={{
                    maxHeight,
                    // No transition while the finger is down, or the sheet lags behind it.
                    ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : {}),
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Grab handle and title share the drag surface — the handle alone is a
                    4px-tall target, which is a promise the gesture cannot keep. With the
                    header hidden the strip pads out instead, so the gesture still has a
                    reachable band to start in.
                    touch-none stops the browser claiming the drag as a page scroll. */}
                <div
                    className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
                    onPointerDown={onDragStart}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                >
                    <div className={`pt-2.5 flex justify-center ${hideHeader ? 'pb-4' : 'pb-1'}`}>
                        <div className="w-10 h-1 rounded-full bg-stone-300" />
                    </div>

                {!hideHeader && (
                <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-[19px] font-sans font-semibold text-stone-900 tracking-tight leading-tight">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-[13px] text-stone-500 font-normal mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className={btn.icon('touch')}
                        type="button"
                    >
                        <X size={20} className="stroke-[2.2]" />
                    </button>
                </div>
                )}
                </div>

                <div className={`flex-1 min-h-0 overflow-y-auto px-5 ${
                    footer ? 'pb-3' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
                }`}>
                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-stone-200/70">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

/**
 * One labelled row inside a settings sheet: title (and optional description) on
 * the left, its control on the right. Stacks the control underneath when it needs
 * the full width.
 */
/**
 * A row that opens something rather than holding a control: title, its current
 * value underneath, and a chevron.
 *
 * The chevron points RIGHT, not down. These rows read as "expand", but what
 * actually happens is a drill-down — the module arrives as its own sheet over
 * this one — and a down-chevron would promise the content unfolds in place.
 */
export function StudioSheetNavRow({
    title,
    value,
    onClick,
}: {
    title: string;
    value?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left py-4 border-b border-stone-200/70 last:border-b-0 flex items-center justify-between gap-4 active:bg-stone-50 transition-colors"
        >
            <div className="min-w-0">
                <div className="text-[16px] font-sans font-medium text-stone-900 leading-tight">{title}</div>
                {value && (
                    <div className="text-[13px] text-stone-500 font-normal mt-0.5 leading-snug truncate">{value}</div>
                )}
            </div>
            <ChevronRight size={20} className="shrink-0 text-stone-400 stroke-[2.2]" />
        </button>
    );
}

export function StudioSheetRow({
    title,
    description,
    control,
    stacked = false,
}: {
    title: string;
    description?: string;
    control: React.ReactNode;
    stacked?: boolean;
}) {
    return (
        <div className={`py-4 border-b border-stone-200/70 last:border-b-0 ${stacked ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-4'}`}>
            <div className="min-w-0">
                <div className="text-[16px] font-sans font-medium text-stone-900 leading-tight">{title}</div>
                {description && (
                    <div className="text-[13px] text-stone-500 font-normal mt-0.5 leading-snug">{description}</div>
                )}
            </div>
            <div className={stacked ? 'w-full' : 'shrink-0'}>{control}</div>
        </div>
    );
}
