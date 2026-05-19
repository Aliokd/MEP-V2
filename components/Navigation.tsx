"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
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
    const isOnboarding = pathname === '/onboarding';
    const isHome = pathname === '/';
    if (isPlatform || isOnboarding || isHome) return null; // Hide for platform, onboarding, or home

    const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || pathname !== '/'
        ? 'bg-white/90 backdrop-blur-md py-4 border-b border-stone-200/80 shadow-xs'
        : 'py-8 bg-transparent'
        }`;

    return (
        <nav className={`${navClasses} px-6 md:px-12 flex items-center justify-between font-sans`}>
            <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">
                <Logo size="md" />
            </Link>

            <div className="hidden lg:flex items-center gap-12 text-[10px] uppercase tracking-[0.2em] text-stone-800 font-sans font-bold">
                <Link href="/method" className={`hover:text-stone-950 transition-colors ${pathname === '/method' ? 'text-stone-950 underline underline-offset-4' : ''}`}>The Method</Link>
                <Link href="/maestro" className={`hover:text-stone-950 transition-colors ${pathname === '/maestro' ? 'text-stone-950 underline underline-offset-4' : ''}`}>The Maestro</Link>
                <Link href="/curriculum" className={`hover:text-stone-950 transition-colors ${pathname === '/curriculum' ? 'text-stone-950 underline underline-offset-4' : ''}`}>Curriculum</Link>
            </div>

            <div className="flex items-center gap-6">
                {user ? (
                    <div className="flex items-center gap-6">
                        <Link href="/platform" className="text-[10px] uppercase tracking-[0.2em] text-stone-900 font-bold hover:underline">
                            Enter Platform
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-[10px] uppercase tracking-[0.2em] text-stone-700 hover:text-stone-900 transition-colors cursor-pointer font-bold"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-8">
                        <Link href="/signin" className={`text-[10px] uppercase tracking-[0.3em] font-bold text-stone-700 hover:text-stone-950 transition-colors ${pathname === '/signin' ? 'text-stone-950' : ''}`}>
                            SIGN IN
                        </Link>
                        <Link href="/onboarding" className="bg-stone-900 text-[#DCDDD4] hover:bg-stone-850 px-6 py-3 rounded-full text-[10px] tracking-[0.2em] font-bold uppercase transition-all shadow-xs">
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
