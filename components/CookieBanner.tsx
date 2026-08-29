"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { localizePath, splitLocale } from '@/lib/i18n';
import CookiePreferences from '@/components/CookiePreferences';
import { PRIMARY_BUTTON_BLOCK, SECONDARY_BUTTON } from '@/app/onboarding/components/buttonStyles';
import {
    acceptAllCookies,
    getConsentSnapshot,
    getServerConsentSnapshot,
    rejectOptionalCookies,
    subscribeConsent,
} from '@/lib/cookieConsent';

/**
 * The consent ask, as a centred dialog over a blurred page, held there until it
 * is answered.
 *
 * It was a bar along the bottom edge, which is the polite version of this and
 * also the ignorable one: it competes with whatever the page is doing and can
 * be scrolled past. This one stops the page. There is no close button and no
 * escape — the two answers and the settings panel are the way out, which is
 * what "until a choice is made" means.
 *
 * Mounted hidden and revealed in an effect: localStorage doesn't exist during
 * the server render, so deciding visibility there would either flash the dialog
 * at people who already answered, or mismatch on hydration.
 */

/**
 * Where the ask does NOT appear.
 *
 * A blocking dialog over the privacy policy would mean the one thing you cannot
 * do before consenting is read what you are consenting to. These three pages
 * are exactly where someone goes to find that out, and nothing is being tracked
 * while they read — an unanswered dialog is a "no" until it isn't — so the ask
 * simply waits until they navigate somewhere else.
 */
const EXEMPT_PATHS = ['/privacy', '/terms', '/cookies'];

export default function CookieBanner() {
    const { t, language } = useLanguage();
    const pathname = usePathname();

    // Rendering straight from the store would put the dialog in the server HTML
    // — the server can only assume "not answered" — so everyone who already
    // chose would see it flash before hydration removed it. Gating on mount
    // instead costs new visitors a beat and costs everyone else nothing.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const [showSettings, setShowSettings] = useState(false);

    // Read through the store, not mirrored into state, so the dialog comes back
    // when the choice is cleared — and disappears here when it is answered in
    // another tab.
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

    const { path } = splitLocale(pathname || '/');
    const isVisible = mounted && consent === null && !EXEMPT_PATHS.includes(path);

    // Hold the page still underneath. Without this the blurred backdrop scrolls
    // with the wheel, which reads as the page half-working rather than as
    // waiting. The scrollbar's width is given back as padding, so removing it
    // doesn't shift the layout sideways behind the blur.
    useEffect(() => {
        if (!isVisible) return;
        const root = document.documentElement;
        const gutter = window.innerWidth - root.clientWidth;
        const prevOverflow = root.style.overflow;
        const prevPadding = root.style.paddingRight;
        root.style.overflow = 'hidden';
        if (gutter > 0) root.style.paddingRight = `${gutter}px`;
        return () => {
            root.style.overflow = prevOverflow;
            root.style.paddingRight = prevPadding;
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return createPortal(
        <div
            className="sheet-shell fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('cookies.aria_label')}
        >
            {/* No onClick: clicking away is not one of the answers. */}
            <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-md sheet-backdrop-enter" aria-hidden="true" />

            <div className="sheet-panel relative w-full max-w-md max-h-[86vh] flex flex-col bg-white rounded-[22px] border border-stone-200 shadow-xl overflow-hidden">
                {showSettings ? (
                    <>
                        <div className="flex items-start gap-3 px-6 pt-6 pb-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowSettings(false)}
                                aria-label={t('cookies.back')}
                                className="mt-0.5 text-stone-400 hover:text-stone-700 transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <h2 className="text-lg font-sans font-light text-stone-800">{t('cookies.panel_title')}</h2>
                                <p className="text-sm text-stone-500 leading-relaxed">{t('cookies.panel_intro')}</p>
                            </div>
                        </div>

                        {/* The settings live inside this dialog rather than in a
                            second one on top of it: one ask, opened up. Saving
                            from here is an answer, so it dismisses the whole
                            thing — that is what onSaved unmounting us does. */}
                        <CookiePreferences className="flex-1 min-h-0 px-6 pb-4" />

                        {/* The full page, from inside the panel: someone who
                            wants more than the three descriptions above is
                            already here rather than on the first screen.
                            /cookies is one of the exempt paths above, so the
                            link leads somewhere this dialog isn't in the way. */}
                        <div className="shrink-0 px-6 pb-5 flex justify-center">
                            <Link
                                href={localizePath('/cookies', language)}
                                className="text-[12px] text-stone-600 hover:text-stone-900 underline underline-offset-2 transition-colors"
                            >
                                {t('cookies.read_more')}
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col px-6 pt-7 pb-6 gap-5">
                        <div className="flex flex-col items-center text-center gap-3">
                            <Cookie className="w-7 h-7 text-stone-900" strokeWidth={1.5} />
                            <h2 className="text-xl font-sans font-light text-stone-800">{t('cookies.title')}</h2>
                            <p className="text-[14px] leading-relaxed text-stone-500">{t('cookies.message')}</p>
                        </div>

                        {/* The onboarding's green pill, imported rather than
                            approximated: a visitor meets it five times on the way
                            here and it means "this is the way forward" every time.
                            Its quiet companion comes with it, so the two answers
                            are the same height and the same shape and differ only
                            in weight — which is the one difference they should
                            have. */}
                        <div className="flex flex-col gap-2.5">
                            <button type="button" onClick={() => acceptAllCookies()} className={PRIMARY_BUTTON_BLOCK}>
                                {t('cookies.accept')}
                            </button>
                            <button
                                type="button"
                                onClick={() => rejectOptionalCookies()}
                                className={`${SECONDARY_BUTTON} w-full`}
                            >
                                {t('cookies.necessary')}
                            </button>
                        </div>

                        {/* The one way in to everything else, as underlined text
                            rather than a third pill — a button here would read as
                            a third answer, and this answers nothing. The full page
                            is linked from inside the panel it opens, so this first
                            screen stays two answers and a door. */}
                        <div className="flex flex-col items-center">
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="text-[14px] font-medium text-stone-600 hover:text-stone-900 underline underline-offset-4 transition-colors"
                            >
                                {t('cookies.manage')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
