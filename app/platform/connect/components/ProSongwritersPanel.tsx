"use client";

import { useState } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPlan } from '@/lib/useUserPlan';
import MaxUpgradeModal from '@/app/platform/components/MaxUpgradeModal';

// Set as a CSS background rather than an <img> so a missing file degrades to the
// dark panel colour underneath instead of a broken-image icon.
const PRO_IMAGE = '/assets/pro_songwriters.jpg';

/**
 * The Max-gated half of the "Connect with Songwriters" row.
 *
 * Locked is the state almost everyone sees, so it is the one that carries the
 * design: the photograph, the pitch and the upgrade path. Max subscribers get the
 * same panel without the lock.
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
                // rounded-[24px] matches the songwriters container it now sits beside,
                // rather than the 22px of the cards it used to sit among.
                className="group relative w-full min-h-[213px] h-full rounded-[24px] overflow-hidden bg-[#1c1b1a] text-left select-none transition-all duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)] active:scale-[0.995] cursor-pointer"
            >
                {/* Photograph */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[900ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                    style={{ backgroundImage: `url('${PRO_IMAGE}')` }}
                    aria-hidden="true"
                />
                {/* Legibility scrim — the photo is already dark, this just guarantees
                    the copy holds up against the brighter upper-left corner. */}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25"
                    aria-hidden="true"
                />

                <div className="relative z-10 h-full flex flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-3">
                        {/* Sized to match "Connect with Songwriters" on the other half —
                            these are peer titles across the split, not a card label. */}
                        <span className="text-[20px] font-sans font-medium text-white tracking-tight leading-snug">
                            {t('connect.pro.title')}
                        </span>
                        {locked && !loading && (
                            <span className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white/90 shrink-0">
                                <Lock className="w-3 h-3" />
                                {t('connect.pro.max_badge')}
                            </span>
                        )}
                    </div>

                    <div className="flex items-end justify-between gap-3">
                        <p className="text-[13.5px] font-sans font-normal text-white/70 leading-snug max-w-[85%]">
                            {locked ? t('connect.pro.locked_desc') : t('connect.pro.unlocked_desc')}
                        </p>
                        <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
                    </div>
                </div>
            </button>

            <MaxUpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                reason={t('connect.pro.modal_subtitle')}
            />
        </>
    );
}
