"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenTool, BookOpen, Music, Users, Zap, Bot, X } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface MaestroSidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
}

export default function MaestroSidebar({ isMobileOpen = false, onClose }: MaestroSidebarProps) {
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
        localStorage.setItem('maestro-sidebar-collapsed', JSON.stringify(newState));
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
        { label: 'Create', href: '/platform/create', icon: PenTool },
        { label: 'Learn', href: '/platform', icon: BookOpen },
        { label: 'Practice', href: '/platform/practice', icon: Music },
        { label: 'Connect', href: '#', icon: Users },
    ];

    const bottomItems = [
        { label: 'Settings', href: '#' },
        { label: 'Feedback', href: '#' },
        { label: 'Support', href: '#' },
        { label: 'Log out', onClick: handleSignOut, isBold: true },
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
                    paddingLeft: isCollapsed ? 12 : 24,
                    paddingRight: isCollapsed ? 12 : 24
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-screen fixed inset-y-0 left-0 md:sticky md:top-0 z-50 flex flex-col py-8 justify-between select-none bg-[#E4E4DF] md:bg-transparent border-r border-stone-250/20 md:border-r-0 shadow-xl md:shadow-none"
            >
                {/* Top Logo & Toggle */}
                <div className="flex flex-col gap-10">
                    {!isCollapsed || isMobile ? (
                        <div className="flex items-center justify-start gap-3 min-h-[40px] w-full">
                            <Link href="/platform" className="opacity-95 hover:opacity-100 transition-opacity" onClick={onClose}>
                                <Logo size="md" />
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
                                    className="w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all text-stone-700 hover:text-stone-950 shadow-xs shrink-0"
                                    aria-label="Collapse Sidebar"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                        <path d="M9 3v18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <Link href="/platform" className="opacity-95 hover:opacity-100 transition-opacity flex justify-center w-full" onClick={onClose}>
                                <Logo size="sm" />
                            </Link>
                            <button
                                onClick={toggleSidebar}
                                className="w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all text-stone-700 hover:text-stone-950 shadow-xs shrink-0"
                                aria-label="Expand Sidebar"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                    <path d="M9 3v18" />
                                </svg>
                            </button>
                        </div>
                    )}

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
                                        ${isCollapsed && !isMobile ? 'justify-center px-0' : ''}
                                    `}>
                                        {/* Show icon only when sidebar is collapsed/minimized (and not on mobile) */}
                                        {isCollapsed && !isMobile ? (
                                            <Icon 
                                                size={18} 
                                                className={`${isActive ? 'text-stone-800' : 'text-stone-500 group-hover:text-stone-700'} stroke-[2.2] shrink-0`} 
                                            />
                                        ) : (
                                            /* Show text when expanded or on mobile */
                                            <div className="flex items-center gap-2 select-none">
                                                <span className="font-sans text-[22px] font-semibold tracking-wide whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                                {item.label === 'Connect' && (
                                                    <span className="text-[10px] font-bold text-stone-500 bg-white border border-stone-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans ml-1.5 shadow-3xs">
                                                        soon
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Actions */}
                <div className={`flex flex-col gap-3 w-full ${isCollapsed && !isMobile ? 'items-center' : 'items-start pl-4'}`}>
                    {bottomItems.map((item) => {
                        if (isCollapsed && !isMobile) {
                            return null;
                        }
                        if (item.onClick) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        if (item.onClick) item.onClick();
                                        if (onClose) onClose();
                                    }}
                                    className={`font-sans text-[13px] text-stone-650 hover:text-stone-900 transition-colors text-left ${item.isBold ? 'font-bold mt-2 text-stone-900' : 'font-medium'}`}
                                >
                                    {item.label}
                                </button>
                            );
                        }
                        return (
                            <Link 
                                key={item.label} 
                                href={item.href || '#'}
                                onClick={onClose}
                                className={`font-sans text-[13px] text-stone-650 hover:text-stone-900 transition-colors ${item.isBold ? 'font-bold mt-2 text-stone-900' : 'font-medium'}`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </motion.div>
        </>
    );
}
