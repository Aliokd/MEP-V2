"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { splitLocale, localizePath } from '@/lib/i18n';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    // usePathname() reflects the visible URL (e.g. "/no"), not the rewritten
    // route, so every comparison below needs the locale prefix stripped first —
    // otherwise this nav fails to hide itself on localized pages and stacks on
    // top of that page's own nav.
    const rawPathname = usePathname();
    const { path: pathname } = splitLocale(rawPathname || '/');
    const { user } = useAuth();
    const { language, t } = useLanguage();

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
    const isAdmin = pathname?.startsWith('/admin');
    const isOnboarding = pathname === '/onboarding';
    const isHome = pathname === '/';
    if (isPlatform || isAdmin || isOnboarding || isHome) return null; // Hide for platform, admin, onboarding, or home

    const isAuthPage = pathname === '/signin' || pathname === '/reset-password';

    const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
            ? "py-4 px-6 md:px-[10%] bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/10 shadow-sm" 
            : "py-8 px-6 md:px-[10%] bg-transparent"
    }`;

    // Keep whatever language the visitor is reading in when they follow a nav
    // link, instead of dropping them back onto the English URL.
    const homeHref = localizePath('/', language);
    const signinHref = localizePath('/signin', language);
    const waitlistHref = localizePath('/waitlist', language);

    if (isAuthPage) {
        return (
            <nav className={`${navClasses} flex items-center justify-center font-sans`}>
                <Link href={homeHref} className="hover:opacity-80 transition-opacity">
                    <Logo size="lg" />
                </Link>
            </nav>
        );
    }

    return (
        <nav className={`${navClasses} flex items-center justify-between font-sans`}>
            <Link href={homeHref} className="hover:opacity-80 transition-opacity">
                <Logo size="lg" />
            </Link>

            <div className="flex items-center gap-10 text-[15px] text-[#363636]">
                <Link href={`${homeHref}#qa`} className="hover:text-black transition-colors font-medium">{t('home.nav.qa')}</Link>
                <LanguageSwitcher variant="marketing" direction="down" tooltipSide="bottom" />
                {user ? (
                    <div className="flex items-center gap-6">
                        <Link href="/platform" className="font-bold hover:text-black transition-colors">
                            {t('navigation.enter_platform')}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="font-bold hover:text-black transition-colors cursor-pointer"
                        >
                            {t('navigation.logout')}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <Link href={signinHref} className="hover:text-black transition-colors font-medium">{t('signin.sign_in')}</Link>
                        <Link href={`${waitlistHref}?from=nav`} className="bg-[#86BE7F] hover:opacity-90 text-stone-900 px-4 py-1.5 rounded-[15px] font-semibold transition-all">{t('home.nav.waitlist')}</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
