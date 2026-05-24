"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, BookOpen, Music, Users, Zap, Bot } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function MaestroSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem('maestro-sidebar-collapsed');
        if (saved !== null) {
            setIsCollapsed(JSON.parse(saved));
        }
        setMounted(true);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('maestro-sidebar-collapsed', JSON.stringify(newState));
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.push('/signin');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const menuItems = [
        { label: 'Free hand', href: '/platform/freehand', icon: PenTool },
        { label: 'Lectures', href: '/platform', icon: BookOpen },
        { label: 'Practice', href: '/platform/practice', icon: Music },
        { label: 'Community', href: '#', icon: Users },
        { label: 'Advanced', href: '#', icon: Zap },
        { label: 'Ask AI', href: '#', icon: Bot },
    ];

    const bottomItems = [
        { label: 'Settings', href: '#' },
        { label: 'Feedback', href: '#' },
        { label: 'Support', href: '#' },
        { label: 'Log out', onClick: handleSignOut, isBold: true },
    ];

    if (!mounted) return null;

    return (
        <motion.div
            animate={{ 
                width: isCollapsed ? 100 : 260,
                paddingLeft: isCollapsed ? 12 : 24,
                paddingRight: isCollapsed ? 12 : 24
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-screen sticky top-0 left-0 z-50 flex flex-col py-8 justify-between select-none"
        >
            {/* Top Logo & Toggle */}
            <div className="flex flex-col gap-10">
                {!isCollapsed ? (
                    <div className="flex items-center justify-between min-h-[40px] w-full">
                        <Link href="/platform" className="opacity-95 hover:opacity-100 transition-opacity">
                            <Logo size="md" />
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            className="w-9 h-9 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all text-stone-700 hover:text-stone-950 shadow-xs"
                        >
                            {/* Sidebar layout split-view representation */}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                <path d="M9 3v18" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 w-full">
                        <Link href="/platform" className="opacity-95 hover:opacity-100 transition-opacity flex justify-center w-full">
                            <Logo size="sm" />
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            className="w-8 h-8 rounded-full bg-white/50 border border-stone-250/30 flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all text-stone-700 hover:text-stone-950 shadow-xs"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                                <path d="M9 3v18" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex flex-col gap-2 w-full">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/platform' && pathname.startsWith('/platform/lesson'));
                        const Icon = item.icon;
                        return (
                            <Link key={item.label} href={item.href}>
                                <div className={`
                                    flex items-center gap-4 px-4 py-3 rounded-[12px] transition-all group cursor-pointer
                                    ${isActive 
                                        ? 'bg-white text-stone-900 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-stone-200/40' 
                                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/30'
                                    }
                                    ${isCollapsed ? 'justify-center px-0' : ''}
                                `}>
                                    <Icon 
                                        size={16} 
                                        className={`${isActive ? 'text-stone-900' : 'text-stone-500 group-hover:text-stone-700'} stroke-[2] shrink-0`} 
                                    />
                                    {!isCollapsed && (
                                        <span className="font-sans text-[13px] font-medium tracking-wide whitespace-nowrap">
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className={`flex flex-col gap-3 w-full ${isCollapsed ? 'items-center' : 'items-start pl-4'}`}>
                {bottomItems.map((item) => {
                    if (isCollapsed) {
                        return null; // Don't show bottom text links when collapsed to keep layout extremely clean
                    }
                    if (item.onClick) {
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
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
                            className={`font-sans text-[13px] text-stone-650 hover:text-stone-900 transition-colors ${item.isBold ? 'font-bold mt-2 text-stone-900' : 'font-medium'}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
