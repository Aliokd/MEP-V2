"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Heart } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Idea, IdeaCategory, LYRICS_IDEAS_BY_LANGUAGE, MELODY_IDEAS_BY_LANGUAGE, VIBE_IDEAS_BY_LANGUAGE, CHORDS_IDEAS_BY_LANGUAGE } from '../data/ideas';
import { fetchIdeas } from '@/lib/contentClient';
import { pickLocale, type IdeaDoc } from '@/lib/content';

const CATEGORIES: { id: 'all' | IdeaCategory; labelKey: string }[] = [
    { id: 'all', labelKey: 'learn.ideas_tab_all' },
    { id: 'lyrics', labelKey: 'learn.ideas_tab_lyrics' },
    { id: 'melody', labelKey: 'learn.ideas_tab_melody' },
    { id: 'chords', labelKey: 'learn.ideas_tab_chords' },
    { id: 'vibe', labelKey: 'learn.ideas_tab_vibe' },
];

/** How much of the card behind peeks out above the current one. */
const DECK_PEEK_PX = 28;

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
    const [cmsIdeas, setCmsIdeas] = React.useState<IdeaDoc[] | null>(null);
    const [rawIndex, setIndex] = React.useState(0);

    // Ideas are edited in the admin CMS. Until the content migration has been
    // committed the collection is empty, so the bundled copy in data/ideas.ts
    // stays as the fallback rather than showing an empty Bank of Ideas.
    React.useEffect(() => {
        let cancelled = false;
        fetchIdeas()
            .then(ideas => { if (!cancelled) setCmsIdeas(ideas); })
            .catch(err => {
                console.warn('Falling back to bundled ideas:', err);
                if (!cancelled) setCmsIdeas([]);
            });
        return () => { cancelled = true; };
    }, []);

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

    const allIdeas: Idea[] = React.useMemo(() => {
        const authored: Idea[] = cmsIdeas && cmsIdeas.length > 0
            ? cmsIdeas.map(idea => ({
                id: idea.id,
                category: idea.category,
                title: pickLocale(idea.title, language),
                description: pickLocale(idea.description, language),
                whyItHelps: pickLocale(idea.whyItHelps, language) || undefined,
                example: pickLocale(idea.example, language) || undefined,
            }))
            : [
                ...(LYRICS_IDEAS_BY_LANGUAGE[language] ?? LYRICS_IDEAS_BY_LANGUAGE.en),
                ...(MELODY_IDEAS_BY_LANGUAGE[language] ?? MELODY_IDEAS_BY_LANGUAGE.en),
                ...(VIBE_IDEAS_BY_LANGUAGE[language] ?? VIBE_IDEAS_BY_LANGUAGE.en),
                ...(CHORDS_IDEAS_BY_LANGUAGE[language] ?? CHORDS_IDEAS_BY_LANGUAGE.en),
              ];

        // Categories with no authored ideas yet stand in with placeholders.
        const emptyCategories = (['melody', 'chords', 'vibe'] as IdeaCategory[])
            .filter(category => !authored.some(idea => idea.category === category));
        const placeholders: Idea[] = emptyCategories.flatMap(category =>
            Array.from({ length: 2 }).map((_, i) => ({
                id: `${category}-placeholder-${i + 1}`,
                category,
                title: t('learn.ideas_placeholder_title'),
                description: t('learn.ideas_placeholder_description'),
            }))
        );
        return [...authored, ...placeholders];
    }, [cmsIdeas, language, t]);

    const visibleIdeas = allIdeas
        .filter(idea => activeCategory === 'all' || idea.category === activeCategory)
        .filter(idea => !showOnlyFavorites || likedIds.has(idea.id))
        .filter(idea => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return idea.title.toLowerCase().includes(q) || idea.description.toLowerCase().includes(q);
        });

    // Changing a filter rebuilds the deck, so start it from the top again.
    // Adjusting state during render (rather than in an effect) is React's own
    // recommendation for deriving state from a changed input — it avoids the
    // extra render pass an effect would cost.
    const filterKey = `${activeCategory}|${showOnlyFavorites}|${searchQuery.trim().toLowerCase()}`;
    const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
    if (prevFilterKey !== filterKey) {
        setPrevFilterKey(filterKey);
        setIndex(0);
    }

    // Clamp rather than trust: liking/unliking can shrink the list under the
    // favorites filter while the deck is mid-way through it.
    const index = Math.min(rawIndex, Math.max(0, visibleIdeas.length - 1));
    const currentIdea = visibleIdeas[index];
    const isCurrentLiked = currentIdea ? likedIds.has(currentIdea.id) : false;
    const hasPrev = index > 0;
    const hasNext = index < visibleIdeas.length - 1;

    const goPrev = () => {
        if (!hasPrev) return;
        setIndex(index - 1);
    };

    const goNext = () => {
        if (!hasNext) return;
        setIndex(index + 1);
    };

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4">
            {/* Back arrow, centred tabs, and the search/favourites actions share one
                row. The 1fr/auto/1fr grid keeps the tabs on the true centre line
                regardless of how wide the two sides are. */}
            {/* items-center vertically centres the two icon groups against the tab
                row, while the tabs themselves sit flush to the bottom (self-end) so
                the active underline lands on the row's border. */}
            <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-stone-200/80">
                <button
                    onClick={onBackToLanding}
                    className="justify-self-start text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    aria-label={t('learn.back_to_overview')}
                    title={t('learn.back_to_overview')}
                >
                    <ArrowLeft size={20} strokeWidth={2} />
                </button>

                <div className="self-end flex items-center gap-5 sm:gap-7 text-base sm:text-xl font-sans">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`pb-3 -mb-px border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
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

                <div className="justify-self-end flex items-center gap-3">
                    {isSearchOpen ? (
                        <input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
                            placeholder={t('learn.ideas_search')}
                            className="w-32 sm:w-40 bg-white border border-stone-200/80 rounded-full px-4 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                        />
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                            aria-label={t('learn.ideas_search')}
                            title={t('learn.ideas_search')}
                        >
                            <Search size={19} strokeWidth={2} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowOnlyFavorites(prev => !prev)}
                        aria-pressed={showOnlyFavorites}
                        aria-label={t('learn.ideas_favorites')}
                        title={t('learn.ideas_favorites')}
                        className={`transition-colors cursor-pointer ${
                            showOnlyFavorites ? 'text-red-500' : 'text-stone-400 hover:text-stone-700'
                        }`}
                    >
                        <Heart size={19} strokeWidth={2} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
                    </button>
                </div>
            </div>

            {visibleIdeas.length === 0 ? (
                <div className="w-full flex items-center justify-center py-24 text-sm text-stone-500">
                    {t('learn.ideas_empty')}
                </div>
            ) : currentIdea ? (
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                    {/* Card deck — the next idea peeks out behind the current one,
                        DECK_PEEK_PX being the only knob for how much shows. Takes
                        the space left over so the controls below stay on screen,
                        and clips its contents so the outgoing card disappears at
                        the edge rather than travelling over them. */}
                    <div className="relative flex-1 min-h-0 overflow-hidden">
                        {hasNext && (
                            <div
                                aria-hidden
                                className="absolute left-8 right-8 top-0 bottom-8 bg-white/70 border border-stone-200/70 rounded-[20px]"
                            />
                        )}

                        {/* No `mode="wait"`: both cards are mounted through the
                            transition, so the outgoing one slides down and off while
                            the next rises out of the deck behind it in one motion.
                            Absolute positioning lets them overlap while they do. */}
                        <AnimatePresence initial={false}>
                            <motion.div
                                key={currentIdea.id}
                                initial={{ y: -DECK_PEEK_PX, zIndex: 1 }}
                                animate={{ y: 0, zIndex: 1 }}
                                exit={{ y: '110%', zIndex: 2 }}
                                transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
                                style={{ top: DECK_PEEK_PX }}
                                className="absolute inset-x-0 bottom-0 bg-white border border-stone-200/80 rounded-[20px] p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-6"
                            >
                                <div className="flex flex-col sm:flex-row gap-6 md:gap-8 flex-1 min-h-0">
                                    {/* Deliberately empty for now — artwork comes later. */}
                                    <div className="w-full sm:w-[40%] shrink-0 h-32 sm:h-full bg-stone-100 rounded-[14px]" />

                                    {/* Scrolls inside the card so a long idea never pushes
                                        the deck controls off screen. */}
                                    <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto pr-1">
                                        <h3 className="text-xl md:text-2xl font-sans font-light text-stone-800">
                                            {currentIdea.title}
                                        </h3>
                                        <p className="text-base font-sans text-stone-500 leading-relaxed">
                                            {currentIdea.description}
                                        </p>

                                        {currentIdea.whyItHelps && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                <span className="text-xs font-sans font-semibold text-stone-500">
                                                    {t('learn.ideas_why_label')}
                                                </span>
                                                <p className="text-sm font-sans text-stone-400 leading-relaxed">
                                                    {currentIdea.whyItHelps}
                                                </p>
                                            </div>
                                        )}

                                        {currentIdea.example && (
                                            <p className="text-sm font-sans text-stone-500 italic border-l-2 border-stone-200 pl-3">
                                                {currentIdea.example}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center justify-between gap-4 pt-2">
                                    <button
                                        onClick={() => toggleLike(currentIdea.id)}
                                        aria-pressed={isCurrentLiked}
                                        aria-label={t('learn.ideas_like')}
                                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                            isCurrentLiked
                                                ? 'border-red-200 bg-red-50 text-red-500'
                                                : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300'
                                        }`}
                                    >
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill={isCurrentLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.35-9.428-8.06C.88 10.31 1.5 6.5 4.7 5.2c2.1-.85 4.2.1 5.3 2 .3.5.9.5 1.2 0 1.1-1.9 3.2-2.85 5.3-2 3.2 1.3 3.82 5.11 2.13 7.74C18.716 16.65 12 21 12 21z" />
                                        </svg>
                                    </button>

                                    <Link
                                        href="/platform/create"
                                        className="px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-sm font-sans font-medium transition-colors"
                                    >
                                        {t('learn.ideas_send_to_canvas')}
                                    </Link>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Deck navigation */}
                    <div className="shrink-0 flex items-center justify-center gap-6">
                        <button
                            onClick={goPrev}
                            disabled={!hasPrev}
                            className="px-6 py-3 bg-stone-200/70 hover:bg-stone-300/70 text-stone-700 text-sm font-semibold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                        >
                            {t('learn.back')}
                        </button>
                        <span className="text-xs text-stone-400 font-sans tabular-nums select-none">
                            {index + 1} / {visibleIdeas.length}
                        </span>
                        <button
                            onClick={goNext}
                            disabled={!hasNext}
                            className="px-6 py-3 bg-[#87b884] hover:bg-[#7cb378] active:bg-[#6fa06b] text-[#1c331a] text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                        >
                            {t('learn.next')}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
