"use client";

import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

// Shared replacement for native window.confirm() — the same dialog originally built
// inline in the Create canvas, pulled out so every part of the platform can use one
// consistent confirmation UI instead of the browser's own dialog chrome.
export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-[24px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-sans font-light text-stone-700 tracking-[-0.025em] leading-[1.3]">
                    {title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed font-sans font-medium">
                    {message}
                </p>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200/70 text-stone-600 rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95"
                    >
                        {cancelLabel || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2.5 rounded-full text-[14px] font-sans font-semibold transition-colors cursor-pointer outline-none active:scale-95 text-white ${
                            destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-stone-800 hover:bg-stone-900'
                        }`}
                    >
                        {confirmLabel || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
