"use client";

import { ArrowUpRight } from 'lucide-react';

interface MaxBannerProps {
    /** Headline — the thing being offered, e.g. "Songwriter Room". */
    title: string;
    /** One line of pitch under it. */
    description: string;
    /** The lock pill's label ("Max"). */
    badgeLabel: string;
    /** Hidden for subscribers, and while the plan is still resolving. */
    showBadge: boolean;
    onClick?: () => void;
    /** Extra classes for the slot it sits in (width, flex behaviour). */
    className?: string;
}

/**
 * The Max upsell banner — one component so every surface that sells Max looks
 * identical. A quiet greige gradient in the platform's own palette, not a
 * photograph, with a band of light crossing it every so often.
 *
 * Used by Connect's Writers' Room panel and by the profile header. It was
 * duplicated between the two once and the copies drifted within a day, which is
 * why the markup lives here rather than in either page.
 */
export default function MaxBanner({
    title,
    description,
    badgeLabel,
    showBadge,
    onClick,
    className = '',
}: MaxBannerProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-haspopup={onClick ? 'dialog' : undefined}
            className={`pro-banner group relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#DFDED6] via-[#D2D1C5] to-[#C2C1B2] text-left select-none transition-all duration-300 active:scale-[0.995] cursor-pointer ${className}`}
        >
            {/* A band of light crossing the panel every so often. Purely
                decorative and never under the pointer, so it can't swallow
                a click on the banner itself. */}
            <span aria-hidden="true" className="pro-shine pointer-events-none absolute inset-0" />

            <div className="relative flex flex-col p-6 md:p-8">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl md:text-[26px] font-sans font-medium text-stone-900 tracking-tight leading-snug">
                            {title}
                        </span>
                        <ArrowUpRight className="w-5 h-5 text-stone-600 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
                    </div>
                    {/* Cut from the same cloth as the banner — the same gradient,
                        so it reads as part of the surface rather than a sticker
                        on it. The white hairline is what keeps it visible
                        against that same gradient behind it. */}
                    {showBadge && (
                        <span className="flex items-center rounded-full bg-gradient-to-br from-[#DFDED6] via-[#D2D1C5] to-[#C2C1B2] border border-white/70 px-3.5 py-1.5 text-[12px] font-semibold text-stone-900 shadow-sm shrink-0">
                            {badgeLabel}
                        </span>
                    )}
                </div>

                <p className="mt-2.5 text-[15px] font-sans font-normal text-stone-600 leading-snug max-w-2xl">
                    {description}
                </p>
            </div>

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
        </button>
    );
}
