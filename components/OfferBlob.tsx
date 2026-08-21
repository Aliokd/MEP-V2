"use client";

import { useLanguage } from '@/context/LanguageContext';

/**
 * The discount badge: a hand-drawn green blob with the offer written across it.
 *
 * Shared by the two surfaces that sell the founding offer — the homepage's
 * urgency section and the campaign's join dialog — so the discount they shout
 * is one string in one place. It replaced the "100% free access" SVG asset that
 * used to sit in the homepage's corner, which promised something else entirely.
 *
 * Drawn inline rather than shipped as an asset because the words are
 * translated: an SVG file would need one copy per language, and would drift the
 * first time the offer changed.
 */
export default function OfferBlob({ className = '' }: { className?: string }) {
    const { t } = useLanguage();

    return (
        <svg
            viewBox="0 0 200 200"
            aria-hidden="true"
            className={`pointer-events-none select-none ${className}`}
        >
            {/* Eight lobes around a circle, anchored on the midpoints between
                them — a gentle wobble rather than a disc, which is what the
                shape needs to survive being blown up to 420px in the homepage's
                corner. */}
            <path
                d="M174.3,128.3 Q156.6,156.6 128.3,174.3 Q100,192 71.7,174.3 Q43.4,156.6 25.7,128.3 Q8,100 25.7,71.7 Q43.4,43.4 71.7,25.7 Q100,8 128.3,25.7 Q156.6,43.4 174.3,71.7 Q192,100 174.3,128.3 Z"
                fill="#86BE7F"
            />
            <text
                x="100"
                y="92"
                textAnchor="middle"
                className="fill-stone-900 font-sans text-[38px] font-bold tracking-tight"
            >
                {t('onboarding.waitlist.email_badge_top')}
            </text>
            <text
                x="100"
                y="130"
                textAnchor="middle"
                className="fill-stone-900 font-sans text-[30px] font-bold tracking-tight"
            >
                {t('onboarding.waitlist.email_badge_bottom')}
            </text>
        </svg>
    );
}
