"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath } from '@/lib/i18n';
import {
    getConsentSnapshot,
    getServerConsentSnapshot,
    subscribeConsent,
    writeConsent,
    type ConsentChoice,
} from '@/lib/cookieConsent';

/**
 * Consent bar, pinned to the bottom until answered.
 *
 * Mounted hidden and revealed in an effect: localStorage doesn't exist during
 * the server render, so deciding visibility there would either flash the bar at
 * people who already answered, or mismatch on hydration.
 */
export default function CookieBanner() {
    const { language, t } = useLanguage();

    // Rendering straight from the store would put the bar in the server HTML —
    // the server can only assume "not answered" — so everyone who already chose
    // would see it flash before hydration removed it. Gating on mount instead
    // costs new visitors a beat and costs everyone else nothing.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

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

    const choose = (choice: ConsentChoice) => writeConsent(choice);

    return (
        <div
            ref={barRef}
            className="fixed inset-x-0 bottom-0 z-[100] bg-white border-t border-stone-200/70 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-4 fade-in duration-500"
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

                {/* Accept and decline sit side by side at the same weight — a
                    decline that is harder to find than accept is not a choice. */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <Link
                        href={localizePath('/privacy', language)}
                        className="px-3 py-2 text-[13px] font-medium text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        {t('cookies.privacy')}
                    </Link>
                    <button
                        type="button"
                        onClick={() => choose('necessary')}
                        className="px-4 py-2 text-[13px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-full transition-all active:scale-95"
                    >
                        {t('cookies.necessary')}
                    </button>
                    <button
                        type="button"
                        onClick={() => choose('all')}
                        className="px-4 py-2 text-[13px] font-semibold text-stone-900 bg-[#86BE7F] hover:opacity-90 rounded-full transition-all active:scale-95"
                    >
                        {t('cookies.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
}
