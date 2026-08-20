"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSheetPresence } from '@/hooks/useSheetPresence';

interface StudioActionSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    /** Optional line under the title, for context the rows themselves don't carry. */
    subtitle?: string;
    children: React.ReactNode;
    /** Sheet height as a dvh fraction. Lyrics wants more than Settings does. */
    maxHeight?: string;
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
}: StudioActionSheetProps) {
    const { mounted, closing } = useSheetPresence(open);
    const [canPortal, setCanPortal] = React.useState(false);

    React.useEffect(() => setCanPortal(true), []);

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
            className={`fixed inset-0 z-[90] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm ${
                closing ? 'sheet-backdrop-exit' : 'sheet-backdrop-enter'
            }`}
            onClick={onClose}
        >
            <div
                className={`w-full bg-white rounded-t-[26px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden ${
                    closing ? 'bottom-sheet-exit pointer-events-none' : 'bottom-sheet-enter'
                }`}
                style={{ maxHeight }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Grab handle — the affordance that says this thing is a sheet. */}
                <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                    <div className="w-10 h-1 rounded-full bg-stone-300" />
                </div>

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
                        className="w-10 h-10 shrink-0 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center active:bg-stone-200 transition-colors"
                        type="button"
                    >
                        <X size={20} className="stroke-[2.2]" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {children}
                </div>
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
