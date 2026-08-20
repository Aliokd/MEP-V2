"use client";

import { useState } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPlan } from '@/lib/useUserPlan';
import MaxUpgradeModal from '@/app/platform/components/MaxUpgradeModal';

/**
 * The Writers' Room banner: the Max-gated discussion room where members bring
 * their questions to professional songwriters. Full-width above the Connect
 * page's content at every breakpoint — a quiet greige gradient in the
 * platform's own palette, not a photograph.
 *
 * Locked is the state almost everyone sees, so it carries the pitch and the
 * upgrade path. Max subscribers get the same banner without the lock.
 */
export default function ProSongwritersPanel() {
    const { t } = useLanguage();
    const { hasMax, loading } = useUserPlan();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const locked = !hasMax;

    return (
        <>
            <button
                type="button"
                onClick={() => { if (locked) setShowUpgrade(true); }}
                aria-haspopup={locked ? 'dialog' : undefined}
                className="pro-banner group relative w-full rounded-[24px] overflow-hidden bg-gradient-to-br from-[#DFDED6] via-[#D2D1C5] to-[#C2C1B2] text-left select-none transition-all duration-300 active:scale-[0.995] cursor-pointer"
            >
                {/* A band of light crossing the panel every so often. Purely
                    decorative and never under the pointer, so it can't swallow
                    a click on the banner itself. */}
                <span aria-hidden="true" className="pro-shine pointer-events-none absolute inset-0" />

                <div className="relative flex flex-col p-6 md:p-8">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl md:text-[26px] font-sans font-medium text-stone-900 tracking-tight leading-snug">
                                {t('connect.pro.title')}
                            </span>
                            <ArrowUpRight className="w-5 h-5 text-stone-600 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
                        </div>
                        {locked && !loading && (
                            <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-stone-900 shadow-sm shrink-0">
                                <Lock className="w-3 h-3" />
                                {t('connect.pro.max_badge')}
                            </span>
                        )}
                    </div>

                    <p className="mt-2.5 text-[15px] font-sans font-normal text-stone-600 leading-snug max-w-2xl">
                        {locked ? t('connect.pro.locked_desc') : t('connect.pro.unlocked_desc')}
                    </p>
                </div>
            </button>

            <MaxUpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                reason={t('connect.pro.modal_subtitle')}
            />

            <style jsx>{`
                /*
                 * The sweep is 1.4s of an 9s cycle, so the banner catches the
                 * light now and then rather than shimmering constantly. Kept to
                 * transform, which the compositor can carry on its own — the
                 * banner sits above a scrolling feed.
                 */
                .pro-shine {
                    /* Alpha is high because the panel underneath is already light:
                       white on greige has little headroom, so a timid band reads
                       as nothing at all. Measured, this lifts the peak ~45 RGB. */
                    background: linear-gradient(
                        105deg,
                        transparent 38%,
                        rgba(255, 255, 255, 0.30) 46%,
                        rgba(255, 255, 255, 0.95) 50%,
                        rgba(255, 255, 255, 0.30) 54%,
                        transparent 62%
                    );
                    transform: translateX(-100%);
                    animation: pro-shine 9s ease-in-out infinite;
                    will-change: transform;
                }
                @keyframes pro-shine {
                    0%              { transform: translateX(-100%); }
                    15.5%           { transform: translateX(100%); }
                    15.6%, 100%     { transform: translateX(100%); }
                }

                /* A banner that flashes on a loop is exactly what this setting
                   is for — hold it still instead. */
                @media (prefers-reduced-motion: reduce) {
                    .pro-shine { animation: none; opacity: 0; }
                }
            `}</style>
        </>
    );
}
