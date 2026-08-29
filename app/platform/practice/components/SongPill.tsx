"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackDismiss } from '@/hooks/useBackDismiss';
import { useSheetSwipe } from '@/hooks/useSheetSwipe';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Music4 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { type PracticeSong } from '../data/practiceSongs';
import { usePracticeLibrary } from '../lib/library';
import * as btn from '@/app/platform/components/buttonStyles';

interface SongPillProps {
    /** Title shown on the pill; for uploads there is no matching library id. */
    title: string;
    artist?: string;
    /** The library song currently playing, to mark its row. */
    currentId?: string;
    onSelect: (song: PracticeSong) => void;
}

/**
 * The song pill above the timeline, opening the library right where it stands —
 * switching songs mid-practice shouldn't mean walking back through the chooser.
 * Locked songs are listed but not clickable, same promise as the chooser grid.
 */
export default function SongPill({ title, artist, currentId, onSelect }: SongPillProps) {
    const { t } = useLanguage();
    const songs = usePracticeLibrary();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    /**
     * Below md the library opens as a bottom sheet instead of a dropdown hanging
     * off the pill. Anchored to the pill it ran off the right edge of a phone and
     * covered the timeline it was meant to sit beside; as a sheet it gets the full
     * width, real touch targets and the same dismissals as everything else.
     */
    const [isNarrow, setIsNarrow] = useState(false);
    useEffect(() => {
        const check = () => setIsNarrow(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useBackDismiss(open && isNarrow, () => setOpen(false));
    const sheetSwipe = useSheetSwipe(() => setOpen(false), open && isNarrow);

    useEffect(() => {
        if (!open || isNarrow) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, isNarrow]);

    /** One list, rendered into the dropdown on desktop and the sheet on a phone. */
    const rows = (
        <>
                {songs.map(song => {
                    const isCurrent = song.id === currentId;
                    const locked = !song.available;
                    return (
                        <button
                            key={song.id}
                            type="button"
                            disabled={locked}
                            data-song-option={song.id}
                            onClick={() => {
                                setOpen(false);
                                if (!isCurrent) onSelect(song);
                            }}
                            className={`${btn.menuItem()} justify-between gap-3
                                ${isCurrent
                                    ? 'bg-stone-100'
                                    : locked
                                        ? 'cursor-default'
                                        : 'hover:bg-stone-50 cursor-pointer'
                                }`}
                        >
                            <span className="flex items-center gap-3 min-w-0">
                                {/* Artwork, or a note where a song has none */}
                                <span className={`w-10 h-10 shrink-0 rounded-[8px] overflow-hidden bg-stone-100 flex items-center justify-center ${locked ? 'grayscale opacity-50' : ''}`}>
                                    {song.coverUrl ? (
                                        <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Music4 className="w-4 h-4 text-stone-400 stroke-[1.5]" aria-hidden="true" />
                                    )}
                                </span>
                                <span className="min-w-0">
                                    <span className={`block text-sm font-sans font-medium truncate ${locked ? 'text-stone-400' : 'text-stone-900'}`}>
                                        {song.title}
                                    </span>
                                    <span className={`block text-xs font-sans truncate ${locked ? 'text-stone-300' : 'text-stone-500'}`}>
                                        {song.artist}
                                    </span>
                                </span>
                            </span>
                            {locked && (
                                <span className="shrink-0 whitespace-nowrap rounded-full bg-stone-100 text-stone-400 px-3 py-0.5 text-xs font-sans">
                                    {t('common.coming_soon')}
                                </span>
                            )}
                        </button>
                    );
                })}
        </>
    );

    return (
        <div ref={rootRef} className="relative" data-song-pill>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-label={t('practice.change_song')}
                className={`${btn.secondary('sm')} max-w-full gap-3 cursor-pointer`}
            >
                <span className="text-sm font-sans font-medium text-stone-900 truncate">{title}</span>
                {artist && (
                    <span className="text-sm font-sans text-stone-500 truncate hidden sm:inline">{artist}</span>
                )}
                <ChevronDown
                    size={16}
                    className={`stroke-[2] text-stone-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Phone: the library as a bottom sheet, portalled to <body> so no
                ancestor's overflow or transform can clip or reposition it. */}
            {open && isNarrow && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[120] flex items-end justify-center bg-stone-900/45 backdrop-blur-md sheet-backdrop-enter"
                    onClick={() => setOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('practice.change_song')}
                        className="w-full max-h-[80dvh] bg-white rounded-t-[26px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden bottom-sheet-enter"
                        onClick={(e) => e.stopPropagation()}
                        {...sheetSwipe.swipeHandlers}
                        style={sheetSwipe.swipeStyle}
                    >
                        <div className="shrink-0 pt-2.5 pb-4 flex justify-center">
                            <div className="w-10 h-1 rounded-full bg-stone-300" />
                        </div>
                        {/* Bigger rows than the dropdown's: this is a thumb target now,
                            not a pointer one. */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-1 [&_button]:min-h-[64px] [&_button]:px-4 [&_button]:rounded-2xl">
                            {rows}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Desktop: the dropdown, anchored to the pill. The wrapper owns
                positioning; framer-motion's inline transform on the animated panel
                would override any translate utility placed there. */}
            <AnimatePresence>
                {open && !isNarrow && (
                    <div className="absolute top-full left-0 mt-3 z-50">
                        <motion.div
                            data-song-menu
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="w-[min(88vw,360px)] max-h-[min(50vh,420px)] overflow-y-auto no-scrollbar bg-white/95 backdrop-blur-md border border-stone-200/60 rounded-[20px] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
                        >
                            {rows}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
