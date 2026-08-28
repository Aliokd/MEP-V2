"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Cookie, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CookiePreferencesDialog from '@/components/CookiePreferencesDialog';
import {
    acceptAllCookies,
    getConsentSnapshot,
    getServerConsentSnapshot,
    rejectOptionalCookies,
    subscribeConsent,
} from '@/lib/cookieConsent';

/**
 * Consent bar, pinned to the bottom until answered.
 *
 * Mounted hidden and revealed in an effect: localStorage doesn't exist during
 * the server render, so deciding visibility there would either flash the bar at
 * people who already answered, or mismatch on hydration.
 */
export default function CookieBanner() {
    const { t } = useLanguage();

    // Rendering straight from the store would put the bar in the server HTML —
    // the server can only assume "not answered" — so everyone who already chose
    // would see it flash before hydration removed it. Gating on mount instead
    // costs new visitors a beat and costs everyone else nothing.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const [settingsOpen, setSettingsOpen] = useState(false);

    // Read through the store, not mirrored into state, so the bar comes back
    // when the privacy page clears the choice — and disappears here when it is
    // answered in another tab.
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

    const isVisible = mounted && consent === null;

    // Publish the bar's height as --consent-h so bottom-anchored UI can sit clear
    // of it. Without this the bar (fixed, z-100, and ~128px tall on a phone once
    // it wraps to two rows) silently covers the Create canvas toolbar — REC, tools,
    // Demo Studio and Inspirations are all unclickable until consent is answered,
    // which is exactly when every new visitor meets them. Measured rather than
    // hard-coded because the height moves with locale, font size and breakpoint.
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = document.documentElement;
        const clear = () => root.style.removeProperty('--consent-h');
        if (!isVisible) { clear(); return; }
        const el = barRef.current;
        if (!el) return;
        const apply = () => root.style.setProperty('--consent-h', `${el.offsetHeight}px`);
        apply();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
        ro?.observe(el);
        return () => { ro?.disconnect(); clear(); };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <>
            <div
                ref={barRef}
                // floating-sheet-enter, not `animate-in slide-in-from-bottom-4`: without
                // tailwindcss-animate installed those utilities compile to nothing, so
                // the bar simply appeared. This is the rise-and-fade they described, and
                // unlike .bottom-sheet-enter it isn't gated off above md — the consent
                // bar is a full-width bar at every width, not a phone-only sheet.
                className="fixed inset-x-0 bottom-0 z-[100] bg-white border-t border-stone-200/70 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] floating-sheet-enter"
                role="dialog"
                aria-live="polite"
                aria-label={t('cookies.aria_label')}
            >
                <div className="mx-auto max-w-6xl px-5 py-3 md:px-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Cookie className="w-[18px] h-[18px] shrink-0 text-stone-400" strokeWidth={1.5} />
                        <p className="text-[13px] leading-snug text-stone-600 font-sans">
                            {t('cookies.message')}
                        </p>
                    </div>

                    {/* Three controls, left to right: "Manage settings" (tertiary),
                        "Only necessary" (secondary), "Accept all" (primary).

                        The bar used to carry both "Reject" and "Only necessary",
                        two labels writing the same decline, because there was
                        nowhere else to go. Now there is: the third door leads to
                        the panel where the two optional categories are separate
                        answers, which is what someone looking for "Reject" was
                        usually after. Declining outright keeps a control of equal
                        weight to accepting — that part is not a style choice. */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <button
                            type="button"
                            onClick={() => setSettingsOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
                            {t('cookies.manage')}
                        </button>
                        <button
                            type="button"
                            onClick={() => rejectOptionalCookies()}
                            className="px-4 py-2 text-[13px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-full transition-all active:scale-95"
                        >
                            {t('cookies.necessary')}
                        </button>
                        <button
                            type="button"
                            onClick={() => acceptAllCookies()}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-full transition-all active:scale-95"
                        >
                            {t('cookies.accept')}
                        </button>
                    </div>
                </div>
            </div>

            <CookiePreferencesDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
    );
}
