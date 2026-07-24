"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Idea, IdeaCategory, LYRICS_IDEAS_BY_LANGUAGE } from '../data/ideas';

const CATEGORIES: { id: 'all' | IdeaCategory; labelKey: string }[] = [
    { id: 'all', labelKey: 'learn.ideas_tab_all' },
    { id: 'lyrics', labelKey: 'learn.ideas_tab_lyrics' },
    { id: 'melody', labelKey: 'learn.ideas_tab_melody' },
    { id: 'chords', labelKey: 'learn.ideas_tab_chords' },
    { id: 'vibe', labelKey: 'learn.ideas_tab_vibe' },
];

interface BankOfIdeasProps {
    onBackToLanding: () => void;
}

export default function BankOfIdeas({ onBackToLanding }: BankOfIdeasProps) {
    const { t, language } = useLanguage();
    const [likedIds, setLikedIds] = React.useState<Set<string>>(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = React.useState(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState<'all' | IdeaCategory>('all');

    const toggleLike = (id: string) => {
        setLikedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Melody/Chords/Vibe don't have real content yet — stand in with placeholders.
    const allIdeas: Idea[] = React.useMemo(() => {
        const lyricsIdeas = LYRICS_IDEAS_BY_LANGUAGE[language] ?? LYRICS_IDEAS_BY_LANGUAGE.en;
        const otherCategoryPlaceholders: Idea[] = (['melody', 'chords', 'vibe'] as IdeaCategory[]).flatMap(category =>
            Array.from({ length: 2 }).map((_, i) => ({
                id: `${category}-placeholder-${i + 1}`,
                category,
                title: t('learn.ideas_placeholder_title'),
                description: t('learn.ideas_placeholder_description'),
            }))
        );
        return [...lyricsIdeas, ...otherCategoryPlaceholders];
    }, [language, t]);

    const visibleIdeas = allIdeas
        .filter(idea => activeCategory === 'all' || idea.category === activeCategory)
        .filter(idea => !showOnlyFavorites || likedIds.has(idea.id))
        .filter(idea => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return idea.title.toLowerCase().includes(q) || idea.description.toLowerCase().includes(q);
        });

    return (
        <div className="w-full mb-20 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToLanding}
                        className="text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                        aria-label={t('learn.back_to_overview')}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="group relative">
                        <h1 className="text-3xl font-sans font-light text-stone-500 cursor-default">{t('learn.bank_of_ideas')}</h1>
                        <div className="absolute left-0 top-full mt-2 w-80 max-w-[80vw] bg-white border border-stone-200/80 rounded-[16px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                            <p className="text-sm text-stone-600 font-sans font-medium whitespace-pre-line leading-relaxed">
                                {t('learn.bank_of_ideas_tooltip')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-stone-400 font-sans">
                    {isSearchOpen ? (
                        <input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
                            placeholder={t('learn.ideas_search')}
                            className="w-40 bg-white border border-stone-200/80 rounded-full px-4 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                        />
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="hover:text-stone-800 transition-colors cursor-pointer"
                        >
                            {t('learn.ideas_search')}
                        </button>
                    )}
                    <button
                        onClick={() => setShowOnlyFavorites(prev => !prev)}
                        className={`transition-colors cursor-pointer ${showOnlyFavorites ? 'text-stone-800 font-semibold' : 'hover:text-stone-800'}`}
                    >
                        {t('learn.ideas_favorites')}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 border-b border-stone-200/80 text-sm font-sans">
                {CATEGORIES.map(cat => {
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`pb-3 -mb-px border-b-2 transition-colors cursor-pointer ${
                                isActive
                                    ? 'border-stone-900 text-stone-900 font-semibold'
                                    : 'border-transparent text-stone-400 hover:text-stone-700'
                            }`}
                        >
                            {t(cat.labelKey)}
                        </button>
                    );
                })}
            </div>

            {visibleIdeas.length === 0 ? (
                <div className="w-full flex items-center justify-center py-24 text-sm text-stone-500">
                    {t('learn.ideas_empty')}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleIdeas.map(idea => {
                        const isLiked = likedIds.has(idea.id);
                        return (
                            <div
                                key={idea.id}
                                className="bg-white border border-stone-200/80 rounded-[20px] p-6 flex flex-col justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
                            >
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-xl font-sans font-light text-stone-500">{idea.title}</h3>
                                    <p className="text-base font-sans text-stone-400">{idea.description}</p>

                                    {idea.whyItHelps && (
                                        <div className="flex flex-col gap-1 pt-1">
                                            <span className="text-xs font-sans font-semibold text-stone-500">
                                                {t('learn.ideas_why_label')}
                                            </span>
                                            <p className="text-sm font-sans text-stone-400">{idea.whyItHelps}</p>
                                        </div>
                                    )}

                                    {idea.example && (
                                        <p className="text-sm font-sans text-stone-500 italic border-l-2 border-stone-200 pl-3">
                                            {idea.example}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        onClick={() => toggleLike(idea.id)}
                                        className={`flex items-center gap-1.5 text-sm font-sans transition-colors cursor-pointer ${isLiked ? 'text-red-500 font-semibold' : 'text-stone-400 hover:text-stone-700'}`}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.35-9.428-8.06C.88 10.31 1.5 6.5 4.7 5.2c2.1-.85 4.2.1 5.3 2 .3.5.9.5 1.2 0 1.1-1.9 3.2-2.85 5.3-2 3.2 1.3 3.82 5.11 2.13 7.74C18.716 16.65 12 21 12 21z" />
                                        </svg>
                                        {t('learn.ideas_like')}
                                    </button>
                                    <Link
                                        href="/platform/create"
                                        className="text-sm font-sans text-stone-500 hover:text-stone-800 transition-colors"
                                    >
                                        {t('learn.ideas_apply_in_create')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
