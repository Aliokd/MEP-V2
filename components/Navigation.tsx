"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { splitLocale, localizePath } from '@/lib/i18n';
import { waitlistJoinPath } from '@/lib/uiFlags';
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

    // These pages own their own top-right language switcher and are a dead end by
    // design — nav links back into a site you can't sign up for just add noise —
    // so they get the centered logo and nothing else. /waiting-list belongs here: with
    // the full nav it rendered a second logo and a second switcher over the page's.
    const isAuthPage = pathname === '/signin' || pathname === '/reset-password' || pathname === '/waiting-list';

    const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
            ? "py-4 px-6 md:px-[10%] bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/10 shadow-sm" 
            : "py-8 px-6 md:px-[10%] bg-transparent"
    }`;

    // Keep whatever language the visitor is reading in when they follow a nav
    // link, instead of dropping them back onto the English URL.
    const homeHref = localizePath('/', language);
    const signinHref = localizePath('/signin', language);
    const waitlistHref = waitlistJoinPath('nav', language);

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
            {/* 96px wordmark on a phone, as on the home page: at 120 it took a third
                of the bar and left the controls fighting for the rest. */}
            <Link href={homeHref} className="hover:opacity-80 transition-opacity [&_svg]:w-[96px] md:[&_svg]:w-[120px]">
                <Logo size="lg" />
            </Link>

            {/* Desktop: words. */}
            <div className="hidden md:flex items-center gap-10 text-[15px] text-[#363636]">
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

            {/* Phone: the home page's bar — icon-only switcher, sign-in as an icon,
                and the one button that matters with its short label. As words,
                "Sign in" and "Join the waitlist" wrapped onto two and three lines
                and the button ran off the edge of the screen. */}
            <div className="flex md:hidden items-center gap-2.5 text-[15px] text-[#363636]">
                <LanguageSwitcher variant="marketing" direction="down" iconOnly tooltipSide="bottom" />
                {user ? (
                    <>
                        <button
                            type="button"
                            onClick={handleLogout}
                            aria-label={t('navigation.logout')}
                            title={t('navigation.logout')}
                            className="w-10 h-10 shrink-0 rounded-full bg-white/70 hover:bg-white border border-stone-300/40 flex items-center justify-center text-[#363636] hover:text-black transition-colors active:scale-95 cursor-pointer"
                        >
                            <LogOut size={18} strokeWidth={1.8} />
                        </button>
                        {/* Icon only: "Enter Platform" as words (longer still in Norwegian
                            and Swedish) ran the bar off the right edge of a 375px screen. */}
                        <Link
                            href="/platform"
                            aria-label={t('navigation.enter_platform')}
                            title={t('navigation.enter_platform')}
                            className="btn-press w-10 h-10 px-0 flex items-center justify-center shrink-0"
                        >
                            <ArrowRight size={18} strokeWidth={2.2} />
                        </Link>
                    </>
                ) : (
                    <>
                        <Link
                            href={signinHref}
                            aria-label={t('signin.sign_in')}
                            title={t('signin.sign_in')}
                            className="w-10 h-10 shrink-0 rounded-full bg-white/70 hover:bg-white border border-stone-300/40 flex items-center justify-center text-[#363636] hover:text-black transition-colors active:scale-95"
                        >
                            <User size={19} strokeWidth={1.8} />
                        </Link>
                        <Link
                            href={`${waitlistHref}?from=nav`}
                            className="btn-press px-5 h-10 font-semibold text-[15px] flex items-center justify-center whitespace-nowrap shrink-0"
                        >
                            {t('home.nav.waitlist_short')}
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
