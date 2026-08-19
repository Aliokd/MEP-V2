"use client";

import { useEffect, useState } from 'react';
import { Laptop } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { safeLocalStorageSetItem } from '@/lib/storage';

/**
 * Mobile-only "use a laptop" hint, pinned to the very top of every screen —
 * marketing site and platform alike (mounted once in the root layout).
 *
 * Fixed (not sticky) so no scroll container, transform, or overflow ancestor can
 * ever crop or carry it away; the sibling spacer div reserves the same height in
 * normal flow so nothing renders underneath it. Fixed chrome that used to live at
 * top-0 (public nav, platform drawer) shifts down by the same h-16 on mobile.
 *
 * The 10-day countdown target persists per browser so it genuinely counts down
 * across visits — recomputing "now + 10 days" each load would show a clock that
 * never moves. At zero it holds rather than restarting.
 */
export const MOBILE_BANNER_HEIGHT_CLASS = 'h-16';

export default function MobileLaptopBanner() {
    const { t } = useLanguage();
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        const KEY = 'veinote-mobile-web-countdown-target';
        let target = parseInt(localStorage.getItem(KEY) || '0', 10);
        if (!target || isNaN(target)) {
            target = Date.now() + 10 * 24 * 60 * 60 * 1000;
            safeLocalStorageSetItem(KEY, String(target));
        }
        const pad = (n: number) => String(n).padStart(2, '0');
        const tick = () => {
            const totalSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
            const d = Math.floor(totalSeconds / 86400);
            const h = Math.floor((totalSeconds % 86400) / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            setCountdown(`${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <>
            <div className={`md:hidden fixed top-0 inset-x-0 z-[70] ${MOBILE_BANNER_HEIGHT_CLASS} flex flex-col items-center justify-center gap-1 bg-[#FFF35F] text-stone-900 px-4 select-none`}>
                <div className="flex items-center gap-2 text-[14px] font-bold tracking-wide">
                    <Laptop size={18} className="shrink-0" strokeWidth={2.2} />
                    <span>{t('navigation.laptop_hint')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-stone-900/75">
                    <span>{t('navigation.mobile_soon')}</span>
                    <span className="font-mono font-bold tabular-nums text-stone-900">{countdown}</span>
                </div>
            </div>
            {/* In-flow spacer: pushes all page content below the fixed bar on mobile. */}
            <div className={`md:hidden ${MOBILE_BANNER_HEIGHT_CLASS}`} aria-hidden="true" />
        </>
    );
}
