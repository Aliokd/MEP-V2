"use client";

import { usePathname } from 'next/navigation';

const Footer = () => {
    const pathname = usePathname();
    const isPlatform = pathname?.startsWith('/platform');
    const isOnboarding = pathname === '/onboarding';
    if (isPlatform || isOnboarding) return null;

    return (
        <footer className="py-24 px-6 md:px-12 border-t border-stone-200 dark:border-white/5 bg-white dark:bg-charcoal text-center md:text-left transition-colors duration-300">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
                <div className="space-y-4">
                    <h2 className="text-2xl font-serif text-gold-500">THE CONSERVATORY</h2>
                    <p className="text-stone-900/40 dark:text-alabaster/40 text-sm font-sans max-w-xs leading-relaxed">
                        Revolutionizing music education through the synthesis of technology and timeless artistry.
                    </p>
                </div>

                <div className="flex gap-20">
                    <div className="space-y-4">
                        <h4 className="text-xs font-sans tracking-[0.3em] uppercase font-bold text-stone-900/80 dark:text-alabaster/80">Follow</h4>
                        <div className="flex flex-col gap-2 text-sm text-stone-900/40 dark:text-alabaster/40 font-sans">
                            <a href="#" className="hover:text-gold-500 transition-colors">Instagram</a>
                            <a href="#" className="hover:text-gold-500 transition-colors">YouTube</a>
                            <a href="#" className="hover:text-gold-500 transition-colors">Twitter</a>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-sans tracking-[0.3em] uppercase font-bold text-stone-900/80 dark:text-alabaster/80">Legal</h4>
                        <div className="flex flex-col gap-2 text-sm text-stone-900/40 dark:text-alabaster/40 font-sans">
                            <a href="#" className="hover:text-gold-500 transition-colors">Terms</a>
                            <a href="#" className="hover:text-gold-500 transition-colors">Privacy</a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mt-24 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-stone-200 dark:border-white/5">
                <p className="text-xs text-stone-900/20 dark:text-alabaster/20 font-sans uppercase tracking-[0.4em]">© 2026 THE CONSERVATORY. ALL RIGHTS RESERVED.</p>
                <p className="text-xs text-gold-500/40 font-serif italic tracking-[0.2em]">Made for those who listen.</p>
            </div>
        </footer>
    );
};

export default Footer;
