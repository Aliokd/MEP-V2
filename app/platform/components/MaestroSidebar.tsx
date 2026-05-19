"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Compass,
    Library,
    Award,
    Settings,
    LogOut,
    User
} from 'lucide-react';
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
    const { user } = useAuth();

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
        { icon: Compass, label: 'Constellation', href: '/platform' },
        { icon: Library, label: 'Curriculum', href: '/platform/curriculum' },
        { icon: Award, label: 'Achievements', href: '/platform/achievements' },
        { icon: User, label: 'Profile', href: '/platform/profile' },
    ];

    if (!mounted) return null;

    return (
        <motion.div
            animate={{ width: isCollapsed ? 80 : 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-screen sticky top-0 left-0 z-50 backdrop-blur-xl bg-[#EFF0E7]/80 border-r border-stone-200/80 flex flex-col"
        >
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
                        >
                            <Link href="/platform">
                                <Logo size="md" />
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-stone-200/55 rounded-[8px] transition-colors text-stone-500 hover:text-stone-900"
                >
                    {isCollapsed ? <div className="w-8 h-8 flex items-center justify-center"><Logo size="sm" /></div> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Profile Summary */}
            {!isCollapsed && (
                <div className="px-6 mb-8 mt-4">
                    <div className="p-4 rounded-[12px] bg-white/60 border border-stone-200/85">
                        <p className="text-[10px] text-stone-500/80 uppercase tracking-[0.2em] mb-1 font-bold">Resonance of {user?.displayName?.split(' ')[0] || 'MAESTRO'}</p>
                        <p className="text-2xl font-sans text-stone-900 font-bold">2,450</p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-grow px-3 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={`
                                flex items-center gap-4 px-4 py-3 rounded-[8px] transition-all group
                                ${isActive ? 'bg-stone-900 text-[#DCDDD4]' : 'text-stone-650 hover:text-stone-900 hover:bg-stone-200/50'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}>
                                <item.icon size={20} className={isActive ? 'text-[#DCDDD4]' : 'text-stone-500 group-hover:text-stone-800'} />
                                {!isCollapsed && (
                                    <span className="font-sans text-sm tracking-wide font-medium">{item.label}</span>
                                )}
                                {isActive && !isCollapsed && (
                                    <motion.div layoutId="activeInd" className="ml-auto w-1 h-1 rounded-full bg-[#DCDDD4]" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-stone-200 space-y-2">
                <button className={`flex items-center gap-4 px-4 py-3 w-full text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-[8px] transition-all font-medium ${isCollapsed ? 'justify-center' : ''}`}>
                    <Settings size={20} className="text-stone-500" />
                    {!isCollapsed && <span className="font-sans text-sm">Settings</span>}
                </button>
                <button
                    onClick={handleSignOut}
                    className={`flex items-center gap-4 px-4 py-3 w-full text-red-650 hover:text-red-750 hover:bg-red-50 rounded-[8px] transition-all font-medium ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="font-sans text-sm">Sign Out</span>}
                </button>
            </div>
        </motion.div>
    );
}
