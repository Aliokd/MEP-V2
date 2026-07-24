"use client";
import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher({ iconOnly = false }: { iconOnly?: boolean }) {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="relative inline-block font-sans text-[13px] tracking-wider" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Change language"
                className={iconOnly
                    ? "flex items-center justify-center w-9 h-9 rounded-full bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all select-none cursor-pointer"
                    : "flex items-center gap-1.5 bg-white/45 hover:bg-white/75 border border-stone-250/15 shadow-[0_1.5px_4px_rgba(0,0,0,0.015)] text-stone-700 hover:text-stone-950 transition-all text-left rounded-[10px] px-3.5 py-2 font-medium uppercase select-none cursor-pointer"
                }
            >
                {renderFlagIcon(currentLang.code, true)}
                {!iconOnly && <span>{currentLang.label}</span>}
            </button>

            {isOpen && (
                <div className={`absolute bottom-full mb-2 w-32 bg-white border border-stone-200/85 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] py-1.5 z-[999] flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-150 ${
                    iconOnly ? 'left-1/2 -translate-x-1/2' : 'left-0'
                }`}>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code as any);
                                setIsOpen(false);
                            }}
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
