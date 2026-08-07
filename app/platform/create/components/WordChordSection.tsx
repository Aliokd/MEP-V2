'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Trash2, ChevronLeft, ChevronRight, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { chordPositions, chordNotes, chordQuality } from '@/lib/chords';
import { Fretboard, useChordPlayback } from './chordVisuals';

/**
 * The chord half of the word popover: whatever chord is sitting on the word that
 * was clicked, shown beside the rhymes and synonyms.
 *
 * One click now answers both questions a writer has about a word — what it rhymes
 * with, and what's being played over it — instead of making them click the lyric
 * for one and the little symbol above it for the other.
 *
 * A narrow column beside the words rather than a band above them: the rhyme list
 * is the tall thing here, so putting the chord next to it uses height that would
 * otherwise be empty instead of pushing the words further down the screen.
 */

export interface WordChordSectionProps {
    /** The chord pinned to this word, or null when it has none. */
    symbol: string | null;
    /** Omitted on a read-only canvas, which hides the remove action. */
    onRemove?: () => void;
    /** Whether chord symbols are currently hidden across the whole canvas. */
    chordsHidden?: boolean;
    /** Toggles that canvas-wide visibility. Omitted when there is no canvas to toggle. */
    onToggleChordsHidden?: () => void;
}

export default function WordChordSection({
    symbol,
    onRemove,
    chordsHidden = false,
    onToggleChordsHidden
}: WordChordSectionProps) {
    const { t } = useLanguage();
    const [variation, setVariation] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const positions = useMemo(() => chordPositions(symbol || ''), [symbol]);
    const notes = useMemo(() => chordNotes(symbol || ''), [symbol]);
    const quality = useMemo(() => chordQuality(symbol || ''), [symbol]);
    const current = positions[variation];
    const { playing, play, stop } = useChordPlayback(current);

    // A different word's chord starts from its own first voicing.
    useEffect(() => { setVariation(0); setMenuOpen(false); stop(); }, [symbol]);

    // Dismiss the menu the way every other menu in the app does: click away or Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const goTo = (next: number) => {
        stop();
        setVariation(((next % positions.length) + positions.length) % positions.length);
    };

    // No chord on this word: render nothing at all and let the rhymes have the full
    // popover. A panel whose only content is "no chord here" is a column of furniture
    // saying nothing — most words carry no chord, so it was the usual case, not the
    // exception.
    if (!symbol) return null;

    return (
        <div className="w-[195px] shrink-0 flex flex-col gap-3 p-4 bg-stone-50/70 rounded-[22px]">
            {/* The chord's own actions live in a menu beside its name, where the thing
                they act on is. The remove action used to sit as a bare bin next to the
                voicing pager — two unrelated controls sharing a row, with the destructive
                one the easiest to hit by accident while stepping through voicings. */}
            <div className="flex items-start justify-between gap-1 min-w-0">
                <div className="min-w-0">
                    <div className="text-[25px] leading-none font-bold text-stone-900 tracking-tight truncate">{symbol}</div>
                    <div className="mt-1.5 text-[15px] font-medium text-stone-400 truncate">
                        {[quality, notes.join(' · ')].filter(Boolean).join(' — ')}
                    </div>
                </div>

                {(onRemove || onToggleChordsHidden) && (
                    <div className="relative shrink-0" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen(open => !open)}
                            aria-label={t('creative.chord_options') || 'Chord options'}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className={`w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                                menuOpen ? 'text-stone-800 bg-stone-200/70' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200/60'
                            }`}
                        >
                            <MoreVertical size={19} />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-10 z-40 w-[168px] bg-white border border-stone-200/80 rounded-[14px] shadow-[0_8px_25px_rgba(0,0,0,0.08)] p-1"
                            >
                                {/* Canvas-wide, not per-chord: this turns every chord symbol
                                    above the lyrics on or off, for reading the words clean. */}
                                {onToggleChordsHidden && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => { setMenuOpen(false); onToggleChordsHidden(); }}
                                        className="w-full px-3 py-2 text-left text-[12px] font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-[10px] cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2"
                                    >
                                        {chordsHidden
                                            ? <Eye size={13} className="shrink-0" />
                                            : <EyeOff size={13} className="shrink-0" />}
                                        <span className="truncate">
                                            {chordsHidden
                                                ? (t('creative.chords_show') || 'Show chords')
                                                : (t('creative.chords_hide') || 'Hide chords')}
                                        </span>
                                    </button>
                                )}

                                {onRemove && onToggleChordsHidden && (
                                    <div className="h-px bg-stone-100 mx-2 my-1" />
                                )}

                                {onRemove && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => { setMenuOpen(false); stop(); onRemove(); }}
                                        className="w-full px-3 py-2 text-left text-[12px] font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-[10px] cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={13} className="shrink-0" />
                                        <span className="truncate">{t('creative.chord_delete') || 'Delete'}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {current && (
                <div className="flex items-center justify-center bg-white rounded-[18px] py-2">
                    <Fretboard position={current} scale={0.81} />
                </div>
            )}

            <div className="flex flex-col gap-2">
                    {current ? (
                        <button
                            type="button"
                            onClick={playing ? stop : play}
                            className="w-full h-[47px] rounded-[16px] bg-white border border-stone-200 shadow-sm hover:border-stone-300 text-stone-800 text-[15px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                        >
                            {playing ? <Square size={14} className="fill-current" /> : <Play size={16} className="fill-current" />}
                            {playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                        </button>
                    ) : (
                        <span className="text-[15px] font-medium text-stone-400">
                            {t('creative.chord_no_diagram') || 'No guitar shape for this chord yet.'}
                        </span>
                    )}

                    {/* Just the voicing pager now, so it centres instead of being pushed
                        left by a control that no longer shares the row. */}
                    <div className="flex items-center justify-center">
                    {positions.length > 1 && (
                        <div className="flex items-center gap-0.5 select-none">
                            <button
                                type="button"
                                onClick={() => goTo(variation - 1)}
                                aria-label={t('creative.chord_prev') || 'Previous voicing'}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer active:scale-95"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-[14px] font-semibold text-stone-400 tabular-nums w-[44px] text-center">
                                {variation + 1}/{positions.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => goTo(variation + 1)}
                                aria-label={t('creative.chord_next') || 'Next voicing'}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer active:scale-95"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    </div>
            </div>
        </div>
    );
}
