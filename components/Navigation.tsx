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
                <h1 className="text-2xl font-serif text-stone-900 dark:text-alabaster tracking-tighter group-hover:text-gold-500 transition-colors">
                    MEP <span className="text-gold-500">V2</span>
                </h1>
            </Link>

            <div className="hidden lg:flex items-center gap-12 text-[10px] uppercase tracking-[0.2em] text-stone-900/70 dark:text-alabaster/70 font-sans font-bold">
                <Link href="/method" className={`hover:text-gold-500 transition-colors ${pathname === '/method' ? 'text-gold-500' : ''}`}>The Method</Link>
                <Link href="/maestro" className={`hover:text-gold-500 transition-colors ${pathname === '/maestro' ? 'text-gold-500' : ''}`}>The Maestro</Link>
                <Link href="/curriculum" className={`hover:text-gold-500 transition-colors ${pathname === '/curriculum' ? 'text-gold-500' : ''}`}>Curriculum</Link>
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
                            className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer font-bold"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-8">
                        <Link href="/signin" className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-900/60 dark:text-alabaster/60 hover:text-gold-500 transition-colors">
                            SIGN IN
                        </Link>
                        <Link href="/signup" className="bg-stone-900 dark:bg-alabaster text-white dark:text-charcoal px-6 py-3 rounded-xs hover:bg-gold-500 dark:hover:bg-gold-500 transition-all text-[10px] tracking-[0.2em] font-bold uppercase">
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
