"use client";
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import Tooltip from '@/components/Tooltip';
import { isLocalizedPath, localizePath, splitLocale, type Language } from '@/lib/i18n';

type Props = {
    iconOnly?: boolean;
    tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
    /** Which way the dropdown opens. The platform sidebar sits at the bottom, so it opens up. */
    direction?: 'up' | 'down';
    /** "app" matches the platform chrome, "marketing" matches the public pages. */
    variant?: 'app' | 'marketing';
};

export default function LanguageSwitcher({
    iconOnly = false,
    tooltipSide = 'top',
    direction = 'up',
    variant = 'app',
}: Props) {
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();

    // Public pages carry the locale in the URL (/no, /sv), so switching there has
    // to navigate as well as update state. Platform pages just switch in place.
    const handleSelect = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);

        const { path } = splitLocale(pathname || '/');
        if (isLocalizedPath(path)) {
            router.push(localizePath(path, lang));
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = [
        { code: 'en', label: 'EN' },
        { code: 'no', label: 'NO' },
        { code: 'sv', label: 'SV' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    const renderFlagIcon = (code: string, isSelected: boolean) => {
        if (code === 'en') {
            return <Globe className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-stone-900' : 'text-stone-400'}`} />;
        }
        if (code === 'sv') {
            return (
                <svg viewBox="0 0 24 24" className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-stone-200/20 shadow-xs">
                    <rect width="24" height="24" fill="#006aa7" />
                    <rect x="7.5" width="4" height="24" fill="#fecc00" />
                    <rect y="10" width="24" height="4" fill="#fecc00" />
                </svg>
            );
        }
        if (code === 'no') {
            return (
                <svg viewBox="0 0 24 24" className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-stone-200/20 shadow-xs">
                    <rect width="24" height="24" fill="#ba0c2f" />
                    <rect x="7" width="5" height="24" fill="#ffffff" />
                    <rect y="10" width="24" height="5" fill="#ffffff" />
                    <rect x="8.5" width="2" height="24" fill="#00205b" />
                    <rect y="11.5" width="24" height="2" fill="#00205b" />
                </svg>
            );
        }
        return null;
    };

    const triggerClasses = variant === 'marketing'
        ? (iconOnly
            ? "flex items-center justify-center w-9 h-9 rounded-full bg-white/50 hover:bg-white/85 border border-stone-300/40 text-stone-700 hover:text-stone-950 transition-all select-none cursor-pointer"
            : "flex items-center gap-1.5 bg-white/50 hover:bg-white/85 border border-stone-300/40 text-stone-700 hover:text-stone-950 transition-all text-left rounded-[12px] px-3 py-1.5 font-medium uppercase select-none cursor-pointer")
        : (iconOnly
            ? "flex items-center justify-center w-9 h-9 rounded-full bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all select-none cursor-pointer"
            : "flex items-center gap-1.5 bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all text-left rounded-[10px] px-3.5 py-2 font-medium uppercase select-none cursor-pointer");

    return (
        <div className="relative inline-block font-sans text-[13px] tracking-wider" ref={dropdownRef}>
            <Tooltip label={t('language.change')} side={tooltipSide} disabled={!iconOnly || isOpen}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={t('language.change')}
                    className={triggerClasses}
                >
                    {renderFlagIcon(currentLang.code, true)}
                    {!iconOnly && <span>{currentLang.label}</span>}
                </button>
            </Tooltip>

            {isOpen && (
                <div className={`absolute w-32 bg-white border border-stone-200/85 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] py-1.5 z-[999] flex flex-col gap-0.5 animate-in fade-in duration-150 ${
                    direction === 'down'
                        ? 'top-full mt-2 slide-in-from-top-1'
                        : 'bottom-full mb-2 slide-in-from-bottom-1'
                } ${
                    iconOnly ? 'left-1/2 -translate-x-1/2' : (variant === 'marketing' ? 'right-0' : 'left-0')
                }`}>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code as Language)}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left hover:bg-stone-50 transition-colors cursor-pointer text-stone-650 hover:text-stone-900 normal-case ${
                                language === lang.code ? 'font-bold bg-stone-100 text-stone-900' : 'font-medium'
                            }`}
                        >
                            {renderFlagIcon(lang.code, language === lang.code)}
                            <span>{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
