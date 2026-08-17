"use client";

import { useCallback, useEffect, useRef, useState, cloneElement, isValidElement, type ReactElement, type MouseEvent, type FocusEvent } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    /** Short label — this is a hover hint, not documentation. Keep it to a few words. */
    label: string;
    children: ReactElement<any>;
    side?: 'top' | 'bottom' | 'left' | 'right';
    /** Set false to temporarily disable (e.g. while a menu triggered by the same element is open). */
    disabled?: boolean;
}

const GAP = 8;
const EDGE_MARGIN = 8;
const MAX_WIDTH = 180;

export default function Tooltip({ label, children, side = 'top', disabled = false }: TooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerElRef = useRef<HTMLElement | null>(null);

    const computePosition = useCallback((el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        // 'top'/'bottom' center the box on the trigger via translate(-50%, ...) — clamp that
        // anchor so a wide (possibly wrapped, two-line) box can't run past the viewport edge.
        // This can throw the pointer slightly off-center from the trigger near an edge, which
        // is a reasonable tradeoff against the tooltip being unreadable/cut off.
        const clampedCenterX = (centerX: number) => {
            const halfMax = MAX_WIDTH / 2;
            return Math.min(Math.max(centerX, halfMax + EDGE_MARGIN), window.innerWidth - halfMax - EDGE_MARGIN);
        };
        switch (side) {
            case 'bottom':
                return { top: rect.bottom + GAP, left: clampedCenterX(rect.left + rect.width / 2) };
            case 'left':
                return { top: rect.top + rect.height / 2, left: rect.left - GAP };
            case 'right':
                return { top: rect.top + rect.height / 2, left: rect.right + GAP };
            case 'top':
            default:
                return { top: rect.top - GAP, left: clampedCenterX(rect.left + rect.width / 2) };
        }
    }, [side]);

    const open = useCallback((el: HTMLElement) => {
        // Touch-primary devices get no tooltips at all. There, a tap fires the same
        // mouseenter/focus events that open one — but nothing ever fires to close it,
        // so it lingers over the UI until the next tap lands somewhere else. Native
        // `title` hints don't show on touch either; suppressing is the platform norm.
        if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
        setPos(computePosition(el));
        setIsOpen(true);
    }, [computePosition]);

    const close = useCallback(() => {
        if (showTimer.current) {
            clearTimeout(showTimer.current);
            showTimer.current = null;
        }
        triggerElRef.current = null;
        setIsOpen(false);
    }, []);

    // Defensive fallback for a mouse-triggered tooltip: onMouseLeave alone can miss —
    // e.g. a click both closes the tooltip AND flips a `disabled` prop true on the same
    // trigger (see Tooltip usages guarded by an open dropdown/menu), and that render
    // race can leave a stale synthetic listener that never fires again. While open,
    // independently confirm the pointer is still over the trigger on every move and
    // force-close otherwise, so the tooltip can't get stuck no matter the cause.
    useEffect(() => {
        if (!isOpen || !triggerElRef.current) return;
        const checkPointer = (e: globalThis.MouseEvent) => {
            const el = triggerElRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const within = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            if (!within) close();
        };
        document.addEventListener('mousemove', checkPointer);
        return () => document.removeEventListener('mousemove', checkPointer);
    }, [isOpen, close]);

    // If a parent disables this tooltip while it's open (e.g. a menu the same trigger
    // opens), close it for real instead of leaving `isOpen` true-but-unrendered — that
    // stale flag would otherwise make it reappear the instant `disabled` clears again.
    useEffect(() => {
        if (disabled) close();
    }, [disabled, close]);

    if (!isValidElement(children) || disabled) return disabled ? children : null;

    const childProps = children.props as Record<string, any>;

    const child = cloneElement(children as ReactElement<Record<string, any>>, {
        onMouseEnter: (e: MouseEvent<HTMLElement>) => {
            childProps.onMouseEnter?.(e);
            const el = e.currentTarget;
            showTimer.current = setTimeout(() => {
                triggerElRef.current = el;
                open(el);
            }, 350);
        },
        onMouseLeave: (e: MouseEvent<HTMLElement>) => {
            childProps.onMouseLeave?.(e);
            close();
        },
        onMouseDown: (e: MouseEvent<HTMLElement>) => {
            childProps.onMouseDown?.(e);
            close();
        },
        onFocus: (e: FocusEvent<HTMLElement>) => {
            childProps.onFocus?.(e);
            open(e.currentTarget);
        },
        onBlur: (e: FocusEvent<HTMLElement>) => {
            childProps.onBlur?.(e);
            close();
        },
    });

    const translate = side === 'top' ? 'translate(-50%, -100%)'
        : side === 'bottom' ? 'translate(-50%, 0)'
        : side === 'left' ? 'translate(-100%, -50%)'
        : 'translate(0, -50%)';

    // Order alone controls visual sequencing (box vs. pointer) — a plain, non-reversed flex
    // direction avoids the two mechanisms fighting each other over which end is "first".
    const flexDir = side === 'top' || side === 'bottom' ? 'flex-col' : 'flex-row';
    const pointerOrder = side === 'top' || side === 'left' ? 'order-2' : 'order-1';
    const boxOrder = side === 'top' || side === 'left' ? 'order-1' : 'order-2';
    const pointerMargin = side === 'top' ? '-mt-[5px]'
        : side === 'bottom' ? '-mb-[5px]'
        : side === 'left' ? '-ml-[5px]'
        : '-mr-[5px]';

    return (
        <>
            {child}
            {isOpen && pos && typeof document !== 'undefined' && createPortal(
                <div
                    role="tooltip"
                    className={`fixed z-[200] flex items-center ${flexDir} pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
                    style={{ top: pos.top, left: pos.left, transform: translate }}
                >
                    <div className={`${boxOrder} bg-stone-900 text-white text-[10px] font-medium leading-snug px-2.5 py-1.5 rounded-xl shadow-lg text-center`} style={{ maxWidth: MAX_WIDTH }}>
                        {label}
                    </div>
                    <div className={`${pointerOrder} ${pointerMargin} w-2 h-2 bg-stone-900 rotate-45 shrink-0`} />
                </div>,
                document.body
            )}
        </>
    );
}
