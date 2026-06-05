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
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
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

    const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
            ? "py-4 px-6 md:px-[10%] bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/10 shadow-sm" 
            : "py-8 px-6 md:px-[10%] bg-transparent"
    }`;

    return (
        <nav className={`${navClasses} flex items-center justify-between font-sans`}>
            <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo size="lg" />
            </Link>

            <div className="flex items-center gap-10 text-[15px] text-[#363636]">
                <Link href="/#qa" className="hover:text-black transition-colors font-medium">Q&A</Link>
                {user ? (
                    <div className="flex items-center gap-6">
                        <Link href="/platform" className="font-bold hover:text-black transition-colors">
                            Enter Platform
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="font-bold hover:text-black transition-colors cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <Link href="/signin" className="font-bold hover:text-black transition-colors">Join now</Link>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
