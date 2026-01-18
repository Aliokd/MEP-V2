"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const isPlatform = pathname?.startsWith('/platform');
    if (isPlatform) return null; // Use dedicated sidebar for platform

    const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || pathname !== '/'
        ? 'bg-white/80 dark:bg-charcoal/80 backdrop-blur-md py-4 border-b border-stone-200 dark:border-white/5 shadow-sm'
        : 'py-8 bg-transparent'
        }`;

    return (
        <nav className={`${navClasses} px-6 md:px-12 flex items-center justify-between`}>
            <Link href="/" className="flex items-center gap-2 group">
                <h1 className="text-2xl font-serif text-stone-900 dark:text-alabaster tracking-tighter group-hover:text-gold-500 transition-colors">THE CONSERVATORY</h1>
            </Link>

            <div className="hidden md:flex items-center gap-12 text-sm uppercase tracking-widest text-stone-900/70 dark:text-alabaster/70 font-sans">
                <Link href="/method" className={`hover:text-gold-500 transition-colors ${pathname === '/method' ? 'text-gold-500 font-bold' : ''}`}>The Method</Link>
                <Link href="/maestro" className={`hover:text-gold-500 transition-colors ${pathname === '/maestro' ? 'text-gold-500 font-bold' : ''}`}>The Maestro</Link>
                <Link href="/curriculum" className={`hover:text-gold-500 transition-colors ${pathname === '/curriculum' ? 'text-gold-500 font-bold' : ''}`}>Curriculum</Link>
            </div>

            <div className="flex items-center gap-6">
                <ThemeToggle />
                {user ? (
                    <div className="flex items-center gap-6">
                        <Link href="/platform" className="text-[10px] uppercase tracking-[0.2em] text-gold-500 font-bold hover:underline">
                            Enter Platform
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <Link href="/signup" className="border border-stone-900 dark:border-alabaster text-stone-900 dark:text-alabaster hover:bg-gold-500 hover:border-gold-500 hover:text-white transition-all text-xs tracking-[0.2em] uppercase py-3 px-6 rounded-xs">
                        Audition Access
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
