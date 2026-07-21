"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenTool, BookOpen, Music, Users, Zap, Bot, X } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useLanguage } from '@/context/LanguageContext';

interface MaestroSidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
    onSupportClick?: () => void;
    onFeedbackClick?: () => void;
}

export default function MaestroSidebar({ isMobileOpen = false, onClose, onSupportClick, onFeedbackClick }: MaestroSidebarProps) {
    const { t } = useLanguage();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem('maestro-sidebar-collapsed');
        if (saved !== null) {
            setIsCollapsed(JSON.parse(saved));
        }
        setMounted(true);

        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
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
        { label: t('navigation.practice'), href: '/platform/practice', icon: Music },
        { label: t('navigation.connect'), href: '/platform/connect', icon: Users },
    ];

    const bottomItems = [
        { 
            label: t('navigation.feedback'), 
            onClick: onFeedbackClick,
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
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-49 md:hidden transition-opacity duration-300"
                />
            )}

            <motion.div
                animate={isMobile ? { 
                    x: isMobileOpen ? 0 : -280,
                    width: 260,
                    paddingLeft: 24,
                    paddingRight: 24
                } : { 
                    x: 0,
                    width: isCollapsed ? 100 : 260,
                    paddingLeft: isCollapsed ? 10 : 24,
                    paddingRight: isCollapsed ? 0 : 24
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-screen fixed inset-y-0 left-0 md:sticky md:top-0 z-50 flex flex-col py-8 select-none bg-[#E4E4DF] md:bg-transparent border-r border-stone-250/20 md:border-r-0 shadow-xl md:shadow-none overflow-visible"
            >
                {/* Collapsed layout: full-height flex centered */}
                {isCollapsed && !isMobile ? (
                    <div className="flex flex-col h-full w-full">
                        {/* Logo — centered with manual px-3 padding, expand icon floats right outside */}
                        <div className="flex justify-end w-full py-2 pr-3 group/logoarea relative">
                            <div className="relative flex items-center">
                                <Link href="/platform/create" className="opacity-95 hover:opacity-100 transition-opacity flex justify-center" onClick={onClose}>
                                    <Logo size="sm" variant="icon" showBeta />
                                </Link>
                                {/* Expand icon: appears to the right of the badge, outside the logo, never overlapping */}
                                <button
                                    onClick={toggleSidebar}
                                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/logoarea:opacity-100 transition-opacity duration-150 w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 text-stone-700 hover:text-stone-950 shadow-xs shrink-0"
                                    aria-label="Expand Sidebar"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                        <path d="M9 3v18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Nav — same top position as expanded (mt-6 matches tighter spacing), full-width active box */}
                        <nav className="flex flex-col gap-1 w-full mt-6">
                            {menuItems.map((item) => {
                                const isActive = pathname === item.href || (item.href === '/platform' && pathname.startsWith('/platform/lesson'));
                                const Icon = item.icon;
                                return (
                                    <Link key={item.label} href={item.href} onClick={onClose} className="block w-full">
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
                                );
                            })}
                        </nav>
                    </div>
                ) : (
                    /* Expanded / mobile layout */
                    <div className="flex flex-col gap-10 justify-between h-full">
                        <div className="flex flex-col gap-10">
                            <div className="flex items-center justify-start gap-3 min-h-[40px] w-full group/logoarea">
                                <Link href="/platform/create" className="opacity-95 hover:opacity-100 transition-opacity" onClick={onClose}>
                                    <Logo size="md" showBeta />
                                </Link>
                                {isMobile ? (
                                    <button
                                        onClick={onClose}
                                        className="ml-auto w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all text-stone-700 hover:text-stone-955 shadow-xs"
                                    >
                                        <X size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={toggleSidebar}
                                        className="opacity-0 group-hover/logoarea:opacity-100 transition-opacity duration-150 w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 text-stone-700 hover:text-stone-950 shadow-xs shrink-0"
                                        aria-label="Collapse Sidebar"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                            <path d="M9 3v18" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Navigation Menu */}
                            <nav className="flex flex-col gap-2.5 w-full">
                                {menuItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href === '/platform' && pathname.startsWith('/platform/lesson'));
                                    const Icon = item.icon;
                                    return (
                                        <Link key={item.label} href={item.href} onClick={onClose}>
                                            <div className={`
                                                flex items-center gap-4 px-4 py-3 rounded-[12px] transition-all group cursor-pointer
                                                ${isActive 
                                                    ? 'bg-white text-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40' 
                                                    : 'text-stone-500 hover:text-stone-800 hover:bg-white/30'
                                                }
                                            `}>
                                                <div className="flex items-center gap-2 select-none">
                                                    <span className="font-sans text-[22px] font-medium tracking-wide whitespace-nowrap">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-col gap-3 w-full items-start pl-4">
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
                                                ? `font-sans text-[13px] text-stone-655 hover:text-stone-950 transition-colors text-left font-bold mt-2 cursor-pointer`
                                                : `flex items-center gap-2 font-sans text-[13px] bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all text-left rounded-[10px] px-3.5 py-2 font-medium group/btn cursor-pointer`
                                            }
                                        >
                                            {item.icon && item.icon("w-[16px] h-[16px] text-stone-500 group-hover/btn:text-stone-900 transition-colors shrink-0")}
                                            <span>{item.label}</span>
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
            </motion.div>
        </>
    );
}