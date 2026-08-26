"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useState, useEffect } from 'react';
import { PenTool, BookOpen, Music, Users, Zap, Bot, X, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useLanguage } from '@/context/LanguageContext';
import { useFeedbackThreads } from '@/lib/useFeedbackThreads';
import { PRACTICE_ENABLED } from '@/lib/uiFlags';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Tooltip from '@/components/Tooltip';
import * as btn from './buttonStyles';

/** Anchors the onboarding guide spotlights onto specific nav entries. */
function tourAnchor(href: string): string | undefined {
    if (href === '/platform/create') return 'nav-create';
    if (href === '/platform') return 'nav-learn';
    if (href === '/platform/practice') return 'nav-practice';
    if (href === '/platform/connect') return 'nav-connect';
    return undefined;
}

interface MaestroSidebarProps {
    /**
     * Rendered between the logo and the nav, on the mobile drawer only. Mind
     * Power lives here rather than in a band under the phone header, where it
     * cost ~70px of permanent vertical space above every screen.
     */
    mobileTopSlot?: React.ReactNode;
    isMobileOpen?: boolean;
    onClose?: () => void;
    onSupportClick?: () => void;
    onFeedbackClick?: () => void;
}

export default function MaestroSidebar({ isMobileOpen = false, onClose, onSupportClick, onFeedbackClick, mobileTopSlot }: MaestroSidebarProps) {
    const { t } = useLanguage();
    const [isCollapsed, setIsCollapsed] = useState(false);
    // Green dot on the feedback button while a reply from the team is unread.
    const { unreadCount } = useFeedbackThreads();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Between the mobile and large-desktop breakpoints, the expanded sidebar eats too much
        // width from the content area — default to collapsed there unless the user has explicitly
        // chosen a state (tracked separately from the collapsed value itself).
        const isTabletRange = () => window.innerWidth >= 768 && window.innerWidth < 1024;

        const applyDefaultCollapsed = () => {
            const hasUserPreference = localStorage.getItem('maestro-sidebar-collapsed-manual') === 'true';
            if (!hasUserPreference) {
                setIsCollapsed(isTabletRange());
            }
        };

        const saved = localStorage.getItem('maestro-sidebar-collapsed');
        const hasUserPreference = localStorage.getItem('maestro-sidebar-collapsed-manual') === 'true';
        if (hasUserPreference && saved !== null) {
            setIsCollapsed(JSON.parse(saved));
        } else {
            setIsCollapsed(isTabletRange());
        }
        setMounted(true);

        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();

        const handleResize = () => {
            checkMobile();
            applyDefaultCollapsed();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        safeLocalStorageSetItem('maestro-sidebar-collapsed-manual', 'true');
        safeLocalStorageSetItem('maestro-sidebar-collapsed', JSON.stringify(newState));
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            if (onClose) onClose();
            router.push('/signin');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const menuItems = [
        { label: t('navigation.create'), href: '/platform/create', icon: PenTool },
        { label: t('navigation.learn'), href: '/platform', icon: BookOpen },
        // When Practice is locked the entry stays visible so the section isn't
        // forgotten, but it doesn't navigate.
        { label: t('navigation.practice'), href: '/platform/practice', icon: Music, locked: !PRACTICE_ENABLED },
        { label: t('navigation.connect'), href: '/platform/connect', icon: Users },
    ];

    const bottomItems = [
        { 
            label: t('navigation.feedback'), 
            onClick: onFeedbackClick,
            hasDot: unreadCount > 0,
            icon: (className?: string) => (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={className}>
                    <path d="M170,112a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h68A6,6,0,0,1,170,112Zm-6,26H96a6,6,0,0,0,0,12h68a6,6,0,0,0,0-12Zm66-14a98.11,98.11,0,0,1-98,98H48a14,14,0,0,1-14-14V124a98,98,0,0,1,196,0Zm-12,0a86,86,0,0,0-172,0v84a2,2,0,0,0,2,2h84A86.1,86.1,0,0,0,218,124Z"></path>
                </svg>
            )
        },
        { label: t('navigation.logout'), onClick: handleSignOut, isBold: true },
    ];

    if (!mounted) return null;

    return (
        <>
            {/* Backdrop for mobile */}
            {isMobileOpen && (
                <div 
                    onClick={onClose}
                    // z-[78]/[79] rather than 49/50. Plenty of page furniture sits at
                    // z-50 and above (the Max pill, pinned headers, the practice song
                    // pill), so at 49 the scrim dimmed everything except exactly the
                    // things that draw the eye — they stayed lit while the rest went
                    // dark. Still below 80, where the sheets and modals begin.
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[78] md:hidden transition-opacity duration-300"
                />
            )}

            <div
                // Height, in three parts, all NATIVE Tailwind utilities on purpose:
                //   md:h-screen  — 100vh, the floor for engines without dvh
                //   md:h-dvh     — the real height, excluding mobile browser chrome
                //   md:max-h-dvh — a hard ceiling, so nothing can stretch it past the
                //                  screen even if a parent tries
                // This used to be `md:h-viewport`, a class hand-written in globals.css.
                // Tailwind cannot build a `md:` variant of a class it does not own, so
                // that generated NO RULE and the rail simply stretched to the height of
                // the content beside it — which is how language / feedback / log out
                // ended up below the fold. Native utilities always generate.
                //
                // The rail scrolls on every breakpoint (it used to be md:overflow-visible,
                // which let content spill past the screen with no way to reach it). In
                // normal use nothing scrolls here at all: the nav has its own scroller and
                // the footer is pinned. This is the floor for the pathological case —
                // below roughly 195px of height the footer alone cannot fit, and scrolling
                // to the options beats clipping them away.
                className={`fixed top-16 bottom-0 left-0 md:h-screen md:h-dvh md:max-h-dvh md:sticky md:top-0 z-[79] md:z-50 flex flex-col pt-8 pb-[calc(1.25rem+env(safe-area-inset-bottom))] select-none bg-[#E4E4DF] md:bg-transparent border-r border-stone-250/20 md:border-r-0 shadow-xl md:shadow-none overflow-y-auto no-scrollbar overscroll-contain transition-[transform,width,padding-left,padding-right] duration-300 ease-out ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
                } md:translate-x-0 ${
                    // The rail scales with the viewport instead of holding one fixed
                    // width: below xl every pixel it keeps is taken straight from the
                    // content beside it, which is where the priority sections live.
                    // The mobile drawer is exempt (it overlays rather than competes)
                    // and keeps the full 260px.
                    isCollapsed && !isMobile
                        ? 'w-[76px] lg:w-[88px] xl:w-[100px] pl-[8px] xl:pl-[10px] pr-0'
                        : isMobile
                            ? 'w-[260px] px-6'
                            : 'w-[190px] lg:w-[220px] xl:w-[260px] px-4 lg:px-5 xl:px-6'
                }`}
            >
                {/* Collapsed layout: full-height flex centered */}
                {isCollapsed && !isMobile ? (
                    <div className="flex flex-col h-full min-h-0 w-full">
                        {/* The expand control sits beside the logo, on its right, and only
                            shows on hover — so the collapsed rail is just the mark until you
                            reach for it.

                            Two things this must not undo. It is `absolute right-0` INSIDE the
                            rail, never the old `left-full` (past the rail's own edge): the rail
                            scrolls now so a short viewport can still reach the footer, and a box
                            that scrolls on one axis cannot stay visible on the other —
                            `overflow-y: auto` forces `overflow-x` to `auto` — which clipped the
                            button clean off. And `touch-reveal` keeps it permanently visible
                            wherever there is no hover pointer; a collapsed rail whose only way
                            back open appears on hover is a dead end on a touch device.

                            No beta badge here, which is what makes the right-hand side free.
                            The badge is 46px beside a 20px mark, so logo plus gap already came
                            to ~72px of a 76px rail and the 28px button landed on top of it —
                            not a near miss to nudge, but 28px more than the rail has. The badge
                            still rides the wordmark everywhere it fits: the expanded sidebar,
                            the mobile drawer, the marketing pages. On the rail the V alone is
                            the mark, centred on the same axis as the nav icons under it, and
                            the button has the right edge to itself.

                            The button then has to scale with the rail, because "centred mark,
                            right-aligned button" only fits under one condition. At rail width
                            W the 20px mark spans W/2 ± 10 and the button spans (W − B) to W, so
                            clearing it needs B ≤ W/2 − 10. The rail is 76/88/100px, so the
                            ceiling is 28/34/40 — and a fixed 28px button therefore lands exactly
                            flush against the mark on the narrow rail, touching it with nothing
                            between. 20/24/28 keeps a real gap at all three widths instead. */}
                        <div className="relative flex flex-col items-center w-full py-2 px-2 group/logoarea">
                            <Link href="/platform/create" className="opacity-95 hover:opacity-100 transition-opacity flex justify-center" onClick={onClose}>
                                <Logo size="sm" variant="icon" />
                            </Link>
                            <Tooltip label={t('navigation.expand_sidebar')} side="right">
                                <button
                                    onClick={toggleSidebar}
                                    className={`${btn.icon('bare')} touch-reveal absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/logoarea:opacity-100 focus-visible:opacity-100 lg:h-6 lg:w-6 xl:h-7 xl:w-7 cursor-pointer`}
                                    aria-label={t('navigation.expand_sidebar')}
                                >
                                    {/* Sized in CSS rather than by the width/height attributes, so
                                        the glyph tracks the three button sizes above it and keeps
                                        the same margin inside the circle at each one. */}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 lg:h-[13px] lg:w-[13px] xl:h-[15px] xl:w-[15px]">
                                        <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                        <path d="M9 3v18" />
                                    </svg>
                                </button>
                            </Tooltip>
                        </div>

                        {/* Nav — same top position as expanded (mt-6 matches tighter spacing), full-width active box */}
                        <nav className="flex flex-col gap-1 w-full mt-6 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                            {menuItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                if (item.locked) {
                                    return (
                                        <Tooltip key={item.label} label={`${item.label} — ${t('common.coming_soon')}`} side="right">
                                            <div
                                                aria-disabled="true"
                                                data-tour={tourAnchor(item.href)}
                                                className="flex items-center justify-center py-3 w-full rounded-[12px] text-stone-500 select-none"
                                            >
                                                <Icon size={18} className="stroke-[2.2] shrink-0" />
                                            </div>
                                        </Tooltip>
                                    );
                                }

                                return (
                                    <Tooltip key={item.label} label={item.label} side="right">
                                        <Link href={item.href} onClick={onClose} className="block w-full" data-tour={tourAnchor(item.href)}>
                                            <div className={`
                                                flex items-center justify-center py-3 w-full rounded-[12px] transition-all group cursor-pointer
                                                ${isActive
                                                    ? 'bg-white text-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40'
                                                    : 'text-stone-500 hover:text-stone-800 hover:bg-white/30'
                                                }
                                            `}>
                                                <Icon
                                                    size={18}
                                                    className={`${isActive ? 'text-stone-800' : 'text-stone-500 group-hover:text-stone-700'} stroke-[2.2] shrink-0`}
                                                />
                                            </div>
                                        </Link>
                                    </Tooltip>
                                );
                            })}
                        </nav>

                        {/* Bottom Actions — icon-only equivalents of the expanded view's language/feedback/logout */}
                        <div className="flex flex-col items-center gap-2 w-full mt-auto pt-6 shrink-0">
                            <LanguageSwitcher iconOnly tooltipSide="right" />
                            <Tooltip label={t('navigation.feedback')} side="right">
                                <button
                                    onClick={onFeedbackClick}
                                    aria-label={t('navigation.feedback')}
                                    className={`${btn.icon('sm')} relative cursor-pointer`}
                                >
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#86BE7F] border-2 border-[#E4E4DF]" />
                                    )}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-[16px] h-[16px]">
                                        <path d="M170,112a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h68A6,6,0,0,1,170,112Zm-6,26H96a6,6,0,0,0,0,12h68a6,6,0,0,0,0-12Zm66-14a98.11,98.11,0,0,1-98,98H48a14,14,0,0,1-14-14V124a98,98,0,0,1,196,0Zm-12,0a86,86,0,0,0-172,0v84a2,2,0,0,0,2,2h84A86.1,86.1,0,0,0,218,124Z"></path>
                                    </svg>
                                </button>
                            </Tooltip>
                            <Tooltip label={t('navigation.logout')} side="right">
                                <button
                                    onClick={handleSignOut}
                                    aria-label={t('navigation.logout')}
                                    className={`${btn.icon('sm')} cursor-pointer`}
                                >
                                    <LogOut size={16} className="stroke-[2.2]" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    /* Expanded / mobile layout.
                       The rail is exactly one viewport tall, and the two halves divide it
                       rather than stacking past it: the nav takes the space that is left
                       and scrolls inside itself, and the footer holds its own height at the
                       bottom. Previously both sat in normal flow, so on a short window — or
                       once the nav grew — language, feedback and log out were pushed below
                       the fold, where the sidebar's `md:overflow-visible` meant they could
                       not even be scrolled to. min-h-0 is what lets the nav shrink at all:
                       a flex item defaults to min-height:auto and refuses to go below its
                       content, which is how the overflow escaped in the first place. */
                    <div className="flex flex-col gap-10 h-full min-h-0">
                        <div className="flex flex-col gap-7 md:gap-10 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                            <div className="relative flex items-center justify-start gap-3 min-h-[40px] w-full group/logoarea">
                                <Link href="/platform/create" className="opacity-95 hover:opacity-100 transition-opacity" onClick={onClose}>
                                    <Logo size="md" showBeta />
                                </Link>
                                {isMobile ? (
                                    <button
                                        onClick={onClose}
                                        className={`${btn.icon('sm')} ml-auto`}
                                    >
                                        <X size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={toggleSidebar}
                                        // Out of flow, pinned to the row's right edge. In flow it followed a
                                        // 145px wordmark, so it needed 193px of row (logo + gap + button)
                                        // while the rail only offers 158px at md and 180px at lg — the
                                        // button was pushed past the right edge and clipped away by the
                                        // rail's overflow, so hovering the logo revealed nothing at those
                                        // widths. Absolute positioning costs no row width, so it lands
                                        // inside the rail at every breakpoint.
                                        // bg-white/90: it now overlaps the end of the wordmark while shown,
                                        // and needs to stay legible on top of it.
                                        className={`${btn.icon('sm')} touch-reveal absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/logoarea:opacity-100 focus-visible:opacity-100`}
                                        aria-label={t('navigation.collapse_sidebar')}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                            <path d="M9 3v18" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Mind Power — drawer only. See mobileTopSlot. */}
                            {isMobile && mobileTopSlot && (
                                <div className="w-full">{mobileTopSlot}</div>
                            )}

                            {/* Navigation Menu */}
                            <nav className="flex flex-col gap-2.5 w-full">
                                {menuItems.map((item) => {
                                    const isActive = pathname === item.href;

                                    if (item.locked) {
                                        return (
                                            <div
                                                key={item.label}
                                                aria-disabled="true"
                                                data-tour={tourAnchor(item.href)}
                                                className="flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-[12px] text-stone-500 select-none"
                                            >
                                                <span className="font-sans text-[18px] lg:text-[20px] xl:text-[22px] font-medium tracking-wide whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                                {/* Same pill treatment as the locked Practice page itself */}
                                                <span className="bg-stone-100 text-stone-500 rounded-full px-2.5 py-1 font-sans text-[11px] whitespace-nowrap">
                                                    {t('common.coming_soon')}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Link key={item.label} href={item.href} onClick={onClose} data-tour={tourAnchor(item.href)}>
                                            <div className={`
                                                flex items-center gap-4 px-3 xl:px-4 py-2.5 xl:py-3 rounded-[12px] transition-all group cursor-pointer
                                                ${isActive
                                                    ? 'bg-white text-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40'
                                                    : 'text-stone-500 hover:text-stone-800 hover:bg-white/30'
                                                }
                                            `}>
                                                <div className="flex items-center gap-2 select-none">
                                                    <span className="font-sans text-[18px] lg:text-[20px] xl:text-[22px] font-medium tracking-wide whitespace-nowrap">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Bottom Actions — shrink-0 so they keep their height whatever the
                            nav above does, and stay on screen without scrolling for them. */}
                        <div className="flex flex-col gap-3 w-full items-start pl-4 shrink-0">
                            <LanguageSwitcher />
                            {bottomItems.map((item: any) => {
                                if (item.onClick) {
                                    return (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                if (item.onClick) item.onClick();
                                                if (onClose) onClose();
                                            }}
                                            className={item.isBold
                                                // py-2.5/-my-1 gives Log out a ~40px tap height without
                                                // moving it: the padding grows the hit area, the negative
                                                // margin gives the extra height back to the layout. It was
                                                // a 20px-tall text link — half the 44px touch guideline.
                                                ? `font-sans text-[13px] text-stone-655 hover:text-stone-950 transition-colors text-left font-bold mt-2 py-2.5 -my-1 cursor-pointer`
                                                : `flex items-center gap-2 font-sans text-[13px] bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all text-left rounded-[10px] px-3.5 py-2 font-medium group/btn cursor-pointer`
                                            }
                                        >
                                            {item.icon && item.icon("w-[16px] h-[16px] text-stone-500 group-hover/btn:text-stone-900 transition-colors shrink-0")}
                                            <span>{item.label}</span>
                                            {item.hasDot && (
                                                <span className="w-2 h-2 rounded-full bg-[#86BE7F] shrink-0 ml-auto" />
                                            )}
                                        </button>
                                    );
                                }
                                return (
                                    <Link 
                                        key={item.label} 
                                        href={item.href || '#'}
                                        onClick={onClose}
                                        className={item.isBold 
                                            ? `font-sans text-[13px] text-stone-655 hover:text-stone-950 transition-colors font-bold mt-2`
                                            : `flex items-center gap-2 font-sans text-[13px] bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-955 transition-all rounded-[10px] px-3.5 py-2 font-medium group/link`
                                        }
                                    >
                                        {item.icon && item.icon("w-[16px] h-[16px] text-stone-500 group-hover/link:text-stone-900 transition-colors shrink-0")}
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}