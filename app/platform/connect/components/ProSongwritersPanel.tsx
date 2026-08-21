"use client";

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPlan } from '@/lib/useUserPlan';
import MaxUpgradeModal from '@/app/platform/components/MaxUpgradeModal';
import MaxBanner from '@/app/platform/components/MaxBanner';

/**
 * The Writers' Room banner: the Max-gated discussion room where members bring
 * their questions to professional songwriters. Full-width above the Connect
 * page's content at every breakpoint.
 *
 * Locked is the state almost everyone sees, so it carries the pitch and the
 * upgrade path. Max subscribers get the same banner without the lock. The
 * banner itself is shared with the profile header — see MaxBanner.
 */
export default function ProSongwritersPanel() {
    const { t } = useLanguage();
    const { hasMax, loading } = useUserPlan();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const locked = !hasMax;

    return (
        <>
            <MaxBanner
                className="w-full"
                title={t('connect.pro.title')}
                description={locked ? t('connect.pro.locked_desc') : t('connect.pro.unlocked_desc')}
                badgeLabel={t('connect.pro.max_badge')}
                showBadge={locked && !loading}
                onClick={locked ? () => setShowUpgrade(true) : undefined}
            />

            <MaxUpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                reason={t('connect.pro.modal_subtitle')}
            />
        </>
    );
}
