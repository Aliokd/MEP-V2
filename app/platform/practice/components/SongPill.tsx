"use client";

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Music4 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PRACTICE_SONGS, type PracticeSong } from '../data/practiceSongs';

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
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
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
    }, [open]);

    return (
        <div ref={rootRef} className="relative" data-song-pill>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-label={t('practice.change_song')}
                className="flex items-center gap-3 pl-5 pr-4 py-2.5 rounded-full bg-white border border-stone-200 hover:border-stone-400 transition-colors max-w-full cursor-pointer"
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

            {/* The wrapper owns positioning; framer-motion's inline transform on the
                animated panel would override any translate utility placed there. */}
            <AnimatePresence>
                {open && (
                    <div className="absolute top-full left-0 mt-3 z-50">
                        <motion.div
                            data-song-menu
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="w-[min(88vw,360px)] max-h-[min(50vh,420px)] overflow-y-auto no-scrollbar bg-white/95 backdrop-blur-md border border-stone-200/60 rounded-[20px] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
                        >
                            {PRACTICE_SONGS.map(song => {
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
                                        className={`w-full text-left px-4 py-2.5 rounded-[12px] flex items-center justify-between gap-3 transition-colors
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
