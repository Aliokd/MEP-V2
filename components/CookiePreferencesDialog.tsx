"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cookie } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';
import CookiePreferences from '@/components/CookiePreferences';

/**
 * The settings panel as a dialog — a centred card above md, a bottom sheet on a
 * phone, like every other panel in the product.
 *
 * Opened from the consent bar's "Manage settings" and from the privacy page. It
 * is the same panel the /cookies page renders; someone who wants the full page
 * (or a link they can keep) is one line away from it at the bottom of this one.
 */
export default function CookiePreferencesDialog({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { t, language } = useLanguage();
    const [mounted, setMounted] = useState(false);

    // Portalling into document.body is a client-only move, so the first render
    // has to be the server's: nothing.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Swipe the sheet down to dismiss it (phones only — see the hook).
    const { swipeHandlers, swipeStyle } = useSheetSwipe(onClose);

    if (!isOpen || !mounted) return null;

    return createPortal(
        // z-[110], one step above the consent bar's z-[100]: the bar is what
        // opens this, and it stays put underneath rather than being unmounted,
        // so the dialog has to win.
        <div className="sheet-shell fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('cookies.panel_title')}>
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm sheet-backdrop-enter" onClick={onClose} />

            <div
                className="sheet-panel relative w-full max-w-lg max-h-[86vh] flex flex-col bg-white rounded-[22px] border border-stone-200 shadow-xl overflow-hidden"
                {...swipeHandlers}
                style={swipeStyle}
            >
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3 shrink-0">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                            <Cookie className="w-[18px] h-[18px] shrink-0 text-stone-400" strokeWidth={1.5} />
                            <h2 className="text-lg font-sans font-light text-stone-800">{t('cookies.panel_title')}</h2>
                        </div>
                        <p className="text-sm text-stone-500 leading-relaxed">{t('cookies.panel_intro')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('cookies.close')}
                        className="text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <CookiePreferences className="flex-1 min-h-0 px-6 pb-5" onSaved={onClose} />

                <div className="px-6 pb-5 shrink-0">
                    <Link
                        href={localizePath('/cookies', language)}
                        onClick={onClose}
                        className="text-[12px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors"
                    >
                        {t('cookies.read_more')}
                    </Link>
                </div>
            </div>
        </div>,
        document.body,
    );
}
