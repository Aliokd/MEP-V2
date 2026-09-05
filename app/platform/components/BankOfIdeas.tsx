"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, ArrowDown, Search, Heart, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { stashTipForCanvas } from '@/lib/canvasTips';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { toggleTipMark, useTipMarks } from '@/lib/tipMarks';
import { Idea, IdeaCategory, LYRICS_IDEAS_BY_LANGUAGE, MELODY_IDEAS_BY_LANGUAGE, VIBE_IDEAS_BY_LANGUAGE, CHORDS_IDEAS_BY_LANGUAGE } from '../data/ideas';
import IdeaGlyph from './IdeaGlyph';
import { fetchIdeas } from '@/lib/contentClient';
import { pickLocale, type IdeaDoc } from '@/lib/content';
import * as btn from './buttonStyles';

const CATEGORIES: { id: 'all' | IdeaCategory; labelKey: string }[] = [
    { id: 'all', labelKey: 'learn.ideas_tab_all' },
    { id: 'lyrics', labelKey: 'learn.ideas_tab_lyrics' },
    { id: 'melody', labelKey: 'learn.ideas_tab_melody' },
    { id: 'chords', labelKey: 'learn.ideas_tab_chords' },
    { id: 'vibe', labelKey: 'learn.ideas_tab_vibe' },
];

/** How much of the card behind peeks out above the current one. */
const DECK_PEEK_PX = 28;

/** Horizontal travel needed before a swipe counts as a navigation. */
const SWIPE_THRESHOLD_PX = 90;

interface BankOfIdeasProps {
    onBackToLanding: () => void;
}

export default function BankOfIdeas({ onBackToLanding }: BankOfIdeasProps) {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    // Shared with the canvas rather than local to this deck: a favourite or a
    // tick belongs to the tip, so it has to read the same in both places.
    const { liked: likedIds, checked: checkedIds } = useTipMarks(user?.uid);
    const [showOnlyFavorites, setShowOnlyFavorites] = React.useState(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState<'all' | IdeaCategory>('all');
    const [cmsIdeas, setCmsIdeas] = React.useState<IdeaDoc[] | null>(null);
    const [rawIndex, setIndex] = React.useState(0);
    // Where a pointer-drag across the card began, for swipe-to-navigate.
    const swipeStartY = React.useRef<number | null>(null);
    /** Set while a drag that began inside the notes column is still scrolling it
     *  rather than moving the card. Cleared at the moment the card takes over. */
    const dragScroller = React.useRef<HTMLElement | null>(null);
    /** Previous pointer Y, for scrolling the notes column by the frame delta. */
    const lastPointerY = React.useRef(0);
    // How far the card has been dragged so far, so it follows the pointer.
    const [dragY, setDragY] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    // While set, the departing tip is still rendered above/below the incoming
    // one so the whole card can be seen leaving. `fromOffset` carries the drag
    // position at the moment of release, so the exit continues from where the
    // finger left the card instead of snapping back to zero first.
    const [deckTransition, setDeckTransition] = React.useState<{
        from: Idea; dir: 1 | -1; fromOffset: number; stamp: number;
    } | null>(null);

    const transitionStamp = React.useRef(0);

    // Overlay lifetime; a hair longer than the 320ms exit so it never blinks out early.
    React.useEffect(() => {
        if (!deckTransition) return;
        const id = setTimeout(() => setDeckTransition(null), 380);
        return () => clearTimeout(id);
    }, [deckTransition]);
    const [showCheckGlow, setShowCheckGlow] = React.useState(false);
    // Bumped per tick so a repeated click restarts the ring rather than
    // continuing the animation already in flight.
    const [checkGlowKey, setCheckGlowKey] = React.useState(0);
    const checkGlowTimeout = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => () => {
        if (checkGlowTimeout.current) clearTimeout(checkGlowTimeout.current);
    }, []);

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
        toggleTipMark('liked', id, user?.uid);
    };

    const toggleChecked = (id: string) => {
        const willCheck = toggleTipMark('checked', id, user?.uid);

        // Ticking a tip off is progress, so it lights the same travelling ring the
        // Create canvas uses. `veinote-celebrate` glows every time (unlike the
        // once-a-day milestone event), and the button runs the identical animation
        // off the same click, so the two read as one moment.
        if (!willCheck) return;
        window.dispatchEvent(new CustomEvent('veinote-celebrate'));
        setCheckGlowKey(key => key + 1);
        setShowCheckGlow(true);
        // Matches the 1.15s round-ring animation. Leaving it mounted past the end
        // of its own animation is what made the effect read as sluggish.
        if (checkGlowTimeout.current) clearTimeout(checkGlowTimeout.current);
        checkGlowTimeout.current = setTimeout(() => setShowCheckGlow(false), 1200);
    };

    /** Hands the tip to the Create canvas, which places it as a card in the lyric
     *  flow on arrival. A fresh id per send on purpose: the same tip can be sent
     *  more than once, and each placed card is dismissed on its own. */
    const sendToCanvas = (idea: Idea) => {
        stashTipForCanvas(
            {
                id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                sourceId: idea.id,
                title: idea.title,
                description: idea.description,
                whyItHelps: idea.whyItHelps,
                example: idea.example,
            },
            user?.uid,
        );
        router.push('/platform/create');
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

    // How many real tips there are, so Mind Power can show ticked tips as a
    // share of the bank. Placeholders are not tips.
    React.useEffect(() => {
        const real = allIdeas.filter(idea => !idea.id.includes('-placeholder-')).length;
        if (real > 0) safeLocalStorageSetItem('mep-total-tips', String(real));
    }, [allIdeas]);

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
    const hasPrev = index > 0;
    const hasNext = index < visibleIdeas.length - 1;

    // One card body, two consumers: the live draggable card and the short-lived
    // exit overlay both render the same content, so the departing card looks
    // identical mid-flight to how it looked at rest.
    const renderCardBody = (idea: Idea) => {
        const liked = likedIds.has(idea.id);
        const checked = checkedIds.has(idea.id);
        return (
            <>
                <div className="flex flex-col sm:flex-row gap-6 md:gap-8 flex-1 min-h-0">
                    {/* No panel behind the glyph — it sits straight on the card so
                        the artwork reads as part of it. A full-height square on the
                        card's left, so the drawing spans top to bottom instead of
                        floating small in a fixed-width strip. */}
                    {/* Capped rather than simply full-height: the square took its
                        width from the card's height, so on a tall card it grew huge
                        and squeezed the copy into a narrow column that then ran off
                        the bottom. */}
                    <div className="w-full sm:w-auto sm:aspect-square shrink-0 h-48 sm:h-full sm:max-h-[300px] lg:max-h-[380px] flex items-center justify-center">
                        <IdeaGlyph
                            seed={idea.id}
                            category={idea.category}
                            className="w-full h-full text-stone-500 opacity-70"
                        />
                    </div>

                    {/* Scrolls inside the card so a long idea never pushes the deck
                        controls off screen — without a visible scrollbar, which read
                        as clutter. */}
                    {/* select-none so a finger-drag across the copy flicks the card
                        instead of starting a native text selection, which cancels the
                        pointer sequence mid-gesture. overflow-visible below md: the
                        phone drags the card rather than this column, so a scroller here
                        would only hide the end of an idea with no way to reach it. */}
                    {/* tip-notes-fade: a short mask at the bottom edge, so a tip
                        that does still overflow reads as continuing rather than as
                        a line sliced in half. */}
                    <div data-notes-scroller className="tip-notes-fade flex-1 flex flex-col gap-4 min-w-0 select-none overflow-visible md:overflow-y-auto no-scrollbar md:pb-1">
                        <h3 className="text-2xl md:text-3xl font-sans font-normal text-stone-800">
                            {idea.title}
                        </h3>
                        <p className="text-lg font-sans text-stone-500 leading-relaxed">
                            {idea.description}
                        </p>

                        {idea.whyItHelps && (
                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-sm font-sans font-semibold text-stone-500">
                                    {t('learn.ideas_why_label')}
                                </span>
                                <p className="text-base font-sans text-stone-400 leading-relaxed">
                                    {idea.whyItHelps}
                                </p>
                            </div>
                        )}

                        {idea.example && (
                            <p className="text-base font-sans text-stone-500 italic border-l-2 border-stone-200 pl-3">
                                {idea.example}
                            </p>
                        )}
                    </div>
                </div>

                {/* Both actions sit together on the right. The heart is the same
                    lucide icon as the favourites filter in the header, so a liked
                    idea reads identically in both. */}
                <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2">
                    <button
                        onClick={() => toggleLike(idea.id)}
                        aria-pressed={liked}
                        aria-label={t('learn.ideas_like')}
                        title={t('learn.ideas_like')}
                        /* `plain`, not `iconGhost`. iconGhost bakes in text-stone-500,
                           and a `text-red-*` added next to it is a second colour
                           utility of equal specificity — the winner is then whichever
                           Tailwind happened to emit last, which here is stone (rule
                           1534 vs red's 1523). That is why a liked heart stayed grey.
                           `plain` carries no colour at all, so each state names its
                           own and there is nothing to resolve. */
                        className={`${btn.plain('bare')} shrink-0 h-11 w-11 cursor-pointer transition-colors duration-300 ${
                            liked
                                ? 'bg-[#D45C5C]/10 text-[#D45C5C] hover:bg-[#D45C5C]/15'
                                : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'
                        }`}
                    >
                        <Heart
                            size={18}
                            strokeWidth={2}
                            fill={liked ? 'currentColor' : 'none'}
                            className={`tip-heart ${liked ? 'tip-heart--liked' : ''}`}
                        />
                    </button>

                    {/* Checked state borrows the Create section's marker:
                        a filled #87b884 circle with a white tick. */}
                    <button
                        onClick={() => toggleChecked(idea.id)}
                        aria-pressed={checked}
                        aria-label={t('learn.ideas_mark_done')}
                        title={t('learn.ideas_mark_done')}
                        /* Two beats, in order: the ring travels to its end, and only
                           then does the fill settle to green — see
                           .mind-power-fill-after-ring. Applied while checked only, so
                           unticking reverts at once instead of hanging. */
                        className={`${btn.iconGhost('md')} relative cursor-pointer ${
                            checked
                                ? 'mind-power-fill-after-ring bg-[#86BE7F] text-stone-900 hover:bg-[#86BE7F] hover:text-stone-900'
                                : ''
                        }`}
                    >
                        {showCheckGlow && (
                            <span
                                key={checkGlowKey}
                                aria-hidden
                                className="mind-power-glow-ring mind-power-glow-ring--round"
                            />
                        )}
                        <Check size={16} className="stroke-[3.5]" />
                    </button>

                    <button
                        type="button"
                        onClick={() => sendToCanvas(idea)}
                        // Takes the rest of the row on a phone: it is the card's actual
                        // outcome, and at its desktop width it sat as the smallest of
                        // three controls next to two icon circles.
                        className={`${btn.secondary('touch')} min-w-0 flex-1 md:flex-none cursor-pointer`}
                    >
                        {t('learn.ideas_send_to_canvas')}
                    </button>
                </div>
            </>
        );
    };

    // Both cards stay on screen through a navigation: the outgoing one keeps
    // travelling in the swipe direction until it is fully off the deck, while
    // the incoming one slides the full distance into its place. The overlay
    // holds a snapshot of the departing tip for the duration of that motion.
    const navigate = (dir: 1 | -1) => {
        const target = index + dir;
        if (target < 0 || target >= visibleIdeas.length || !currentIdea) return;
        transitionStamp.current += 1;
        setDeckTransition({ from: currentIdea, dir, fromOffset: dragY, stamp: transitionStamp.current });
        setDragY(0);
        setIndex(target);
    };
    const goPrev = () => navigate(-1);
    const goNext = () => navigate(1);

    return (
        // py-4 on a phone: with the Learn panel gone below md this sits straight on
        // the page, so the tabs were hard against the header above and the deck
        // controls hard against the browser chrome below.
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4 px-4 py-4 md:px-0 md:py-0">
            {/* Back arrow, centred tabs, and the search/favourites actions share one
                row. The 1fr/auto/1fr grid keeps the tabs on the true centre line
                regardless of how wide the two sides are. */}
            {/* items-center vertically centres the two icon groups against the tab
                row, while the tabs themselves sit flush to the bottom (self-end) so
                the active underline lands on the row's border. */}
            <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-stone-200/80">
                <button
                    onClick={onBackToLanding}
                    className={`${btn.iconGhost('sm')} justify-self-start cursor-pointer`}
                    aria-label={t('learn.back_to_overview')}
                    title={t('learn.back_to_overview')}
                >
                    <ArrowLeft size={20} strokeWidth={2} />
                </button>

                {/* self-center below md, not self-end: the row also holds a back arrow
                    and a search icon, and bottom-aligning the tabs against those left
                    them sitting low and off-axis from both. */}
                <div className="self-center md:self-end flex items-center justify-center gap-5 sm:gap-7 text-base sm:text-xl font-sans">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                // pb-1 on a phone: at pb-3 the underline sat 12px under
                                // the word and read as belonging to the row rather than
                                // to the tab it marks.
                                className={`pb-1 md:pb-3 -mb-px border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
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
                    {/* Toggle only — the field itself opens full width below the tabs,
                        so it never squeezes the centred tab row. */}
                    <button
                        onClick={() => {
                            if (isSearchOpen) setSearchQuery('');
                            setIsSearchOpen(open => !open);
                        }}
                        aria-expanded={isSearchOpen}
                        aria-label={t('learn.ideas_search')}
                        title={t('learn.ideas_search')}
                        className={`${btn.iconGhost('sm')} cursor-pointer ${isSearchOpen ? 'text-stone-900 bg-stone-900/5' : ''}`}
                    >
                        <Search size={19} strokeWidth={2} />
                    </button>
                    <button
                        onClick={() => setShowOnlyFavorites(prev => !prev)}
                        aria-pressed={showOnlyFavorites}
                        aria-label={t('learn.ideas_favorites')}
                        title={t('learn.ideas_favorites')}
                        /* Same reason as the card's heart below: a colour that says
                           state cannot sit next to iconGhost's role colour. */
                        className={`${btn.plain('bare')} shrink-0 h-9 w-9 cursor-pointer transition-colors ${
                            showOnlyFavorites
                                ? 'text-[#D45C5C] hover:text-[#D45C5C]'
                                : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'
                        }`}
                    >
                        <Heart size={19} strokeWidth={2} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
                    </button>
                </div>
            </div>

            {/* Full-width search sits between the tabs and the deck. It is a
                shrink-0 row in the column, so opening it pushes the card down
                rather than overlaying it. */}
            {isSearchOpen && (
                <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setSearchQuery('');
                            setIsSearchOpen(false);
                        }
                    }}
                    placeholder={t('learn.ideas_search')}
                    className="shrink-0 w-full bg-white border border-stone-200/80 rounded-full px-5 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                />
            )}

            {cmsIdeas === null ? (
                /* Hold the deck until the authored tips have answered.
                   Rendering the bundled fallback first and swapping to the CMS
                   list on arrival rebuilt `allIdeas` underneath the deck, so the
                   card at index 0 became a different tip and the deck appeared to
                   change on its own a beat after opening. */
                <div className="flex-1 min-h-0 flex flex-col gap-4 animate-pulse">
                    <div className="flex-1 min-h-0 rounded-[20px] bg-stone-300/20 border border-stone-200/60" />
                    <div className="shrink-0 h-10 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-300/20" />
                        <div className="w-16 h-4 rounded-full bg-stone-300/20" />
                        <div className="w-10 h-10 rounded-full bg-stone-300/20" />
                    </div>
                </div>
            ) : visibleIdeas.length === 0 ? (
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
                                className="absolute left-8 right-8 top-0 bottom-8 bg-[#FAF9F5]/70 border border-stone-200/70 rounded-[20px]"
                            />
                        )}

                        {/* Departing card. A snapshot of the previous tip that keeps
                            travelling in the swipe direction until fully off the deck,
                            starting from wherever the drag released it. Driven by the
                            Web Animations API, so its lifetime is a plain timeout —
                            deliberately no AnimatePresence, whose unfinished exits
                            once piled cards up in the DOM here. Going forward it exits
                            over the incoming card; going back it slips out beneath it. */}
                        {deckTransition && (
                            <div
                                key={deckTransition.stamp}
                                aria-hidden
                                style={{ top: DECK_PEEK_PX, zIndex: deckTransition.dir === 1 ? 3 : 1 }}
                                className="absolute inset-x-0 bottom-0 pointer-events-none"
                                ref={node => {
                                    if (!node || node.dataset.exiting) return;
                                    node.dataset.exiting = '1';
                                    node.animate(
                                        [
                                            { transform: `translateY(${deckTransition.fromOffset}px)` },
                                            { transform: `translateY(${deckTransition.dir * 115}%)` },
                                        ],
                                        { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
                                    );
                                }}
                            >
                                <div className="select-none h-full bg-[#FAF9F5] border border-stone-200/80 rounded-[20px] p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-6">
                                    {renderCardBody(deckTransition.from)}
                                </div>
                            </div>
                        )}

                        {/* Incoming card, keyed on the tip id so each navigation
                            remounts it and replays the slide. It arrives from the
                            opposite edge to the exit: forward pulls the next card down
                            from above, back returns the previous one from below. */}
                        <div
                            key={currentIdea.id}
                            style={{ top: DECK_PEEK_PX, zIndex: 2 }}
                            className={`absolute inset-x-0 bottom-0 ${
                                deckTransition
                                    ? (deckTransition.dir === 1 ? 'deck-enter-from-top' : 'deck-enter-from-bottom')
                                    : ''
                            }`}
                        >
                            <div
                                /* Vertical swipe, matching the way cards move: down goes
                                   forward, up goes back. The whole card is a handle — the
                                   text included. The card tracks the pointer while
                                   dragging, with resistance so it never runs away from
                                   the cursor. */
                                onPointerDown={e => {
                                    const target = e.target as HTMLElement | null;
                                    // Controls keep their own pointer behaviour.
                                    // setPointerCapture below retargets every later
                                    // pointer event — pointerup included — to this card,
                                    // and a button whose pointerup lands somewhere else
                                    // never gets a click. That is why the heart, the tick
                                    // and Send to canvas did not respond to a press that
                                    // started on them.
                                    if (target?.closest('button, a, input, textarea')) {
                                        swipeStartY.current = null;
                                        return;
                                    }
                                    // A drag may start on the text. The notes column
                                    // scrolls, though, so when it has somewhere left to
                                    // scroll the drag moves IT first and only hands over
                                    // to the card at the end of its travel — the usual
                                    // nested-scroll bargain. It is scrolled by hand
                                    // because the card sets touch-action: none, which
                                    // stops the browser doing it for us.
                                    // Not on a phone. There the card IS the gesture — a
                                    // finger landing on the copy is trying to flick to the
                                    // next idea, not to scroll two lines of it — and
                                    // handing the drag to the notes column made the deck
                                    // feel stuck whenever the text happened to overflow.
                                    // The notes are unclipped below md instead (see the
                                    // scroller's own classes), so nothing is lost.
                                    const scroller = window.matchMedia('(min-width: 768px)').matches
                                        ? (target?.closest('[data-notes-scroller]') as HTMLElement | null)
                                        : null;
                                    dragScroller.current =
                                        scroller && scroller.scrollHeight > scroller.clientHeight + 1
                                            ? scroller
                                            : null;
                                    swipeStartY.current = e.clientY;
                                    lastPointerY.current = e.clientY;
                                    setIsDragging(true);
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                }}
                                onPointerMove={e => {
                                    if (swipeStartY.current === null) return;
                                    const scroller = dragScroller.current;

                                    if (scroller) {
                                        const dy = e.clientY - swipeStartY.current;
                                        const atTop = scroller.scrollTop <= 0;
                                        const atBottom =
                                            scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1;
                                        // Dragging down reveals what is above it, so the
                                        // card only takes over once there is nothing above
                                        // left to reveal — and the mirror image going up.
                                        const handOver = (dy > 0 && atTop) || (dy < 0 && atBottom);
                                        if (!handOver) {
                                            scroller.scrollTop -= e.clientY - lastPointerY.current;
                                            lastPointerY.current = e.clientY;
                                            return;
                                        }
                                        // Rebase onto the hand-over point, or the card
                                        // would jump by however far the text just scrolled.
                                        dragScroller.current = null;
                                        swipeStartY.current = e.clientY;
                                        lastPointerY.current = e.clientY;
                                        return;
                                    }

                                    const dy = e.clientY - swipeStartY.current;
                                    // Damped, and capped so the card stays on screen.
                                    setDragY(Math.max(-140, Math.min(140, dy * 0.55)));
                                }}
                                onPointerUp={e => {
                                    const start = swipeStartY.current;
                                    // Still set means the gesture only ever scrolled the
                                    // text, so it must not also flip the card.
                                    const onlyScrolled = dragScroller.current !== null;
                                    dragScroller.current = null;
                                    swipeStartY.current = null;
                                    setIsDragging(false);
                                    setDragY(0);
                                    if (start === null || onlyScrolled) return;
                                    const dy = e.clientY - start;
                                    if (dy >= SWIPE_THRESHOLD_PX) goNext();
                                    else if (dy <= -SWIPE_THRESHOLD_PX) goPrev();
                                }}
                                onPointerCancel={() => {
                                    swipeStartY.current = null;
                                    dragScroller.current = null;
                                    setIsDragging(false);
                                    setDragY(0);
                                }}
                                style={{
                                    // Always an explicit translate, never an absent one:
                                    // transitioning to a removed transform leaves the card
                                    // stuck at its dragged offset instead of springing back.
                                    transform: `translateY(${dragY}px)`,
                                    // No transition while the finger is down, so the card
                                    // tracks it exactly; springs back on release.
                                    transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
                                }}
                                /* select-none: the card is a drag handle, so dragging
                                   it must move the card rather than sweep a text
                                   selection across the tip. */
                                className="select-none h-full bg-[#FAF9F5] border border-stone-200/80 rounded-[20px] p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-6 cursor-grab active:cursor-grabbing touch-none"
                            >
                                {renderCardBody(currentIdea)}
                            </div>
                        </div>
                    </div>

                    {/* Deck navigation */}
                    <div className="shrink-0 flex items-center justify-center gap-6">
                        {/* Arrows point the way the deck moves, matching the swipe. */}
                        <button
                            onClick={goPrev}
                            disabled={!hasPrev}
                            aria-label={t('learn.back')}
                            title={t('learn.back')}
                            className={`${btn.icon('md')} cursor-pointer disabled:cursor-not-allowed`}
                        >
                            <ArrowUp size={18} strokeWidth={2} />
                        </button>
                        <span className="text-xs text-stone-400 font-sans tabular-nums select-none">
                            {index + 1} / {visibleIdeas.length}
                        </span>
                        <button
                            onClick={goNext}
                            disabled={!hasNext}
                            aria-label={t('learn.next')}
                            title={t('learn.next')}
                            className={`${btn.icon('md')} cursor-pointer disabled:cursor-not-allowed`}
                        >
                            <ArrowDown size={18} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
