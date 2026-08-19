"use client";

import { useSyncExternalStore } from 'react';
import { Cookie } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    clearConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
    subscribeConsent,
} from '@/lib/cookieConsent';

/**
 * Lets someone revisit their cookie choice from the privacy policy, which is
 * where the policy tells them to go. Withdrawing consent has to be as easy as
 * giving it, and until this existed the only way to change an answer was to
 * clear site data by hand.
 *
 * Clearing the stored choice brings the bar back rather than silently flipping
 * the setting — the person makes the call again, the same way they made it the
 * first time.
 */
export default function CookieSettingsButton() {
    const { t } = useLanguage();
    const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

    const current =
        consent === 'all'
            ? t('cookies.current_all')
            : consent === 'necessary'
              ? t('cookies.current_necessary')
              : null;

    return (
        <div className="mt-12 pt-8 border-t border-stone-400/20 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1">
                <Cookie className="w-[18px] h-[18px] shrink-0 text-stone-400" strokeWidth={1.5} />
                <p className="text-sm text-stone-600">
                    {current ?? t('cookies.current_unanswered')}
                </p>
            </div>
            <button
                type="button"
                onClick={clearConsent}
                className="px-4 py-2 text-[13px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-full transition-all active:scale-95 self-start sm:self-auto"
            >
                {t('cookies.settings')}
            </button>
        </div>
    );
}
