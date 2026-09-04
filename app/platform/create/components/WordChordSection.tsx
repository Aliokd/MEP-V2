'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Trash2, ChevronLeft, ChevronRight, MoreVertical, Eye, EyeOff, Plus, X, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { chordPositions, chordNotes, chordQuality, COMMON_CHORDS, isValidChord, normalizeChord } from '@/lib/chords';
import { Fretboard, useChordPlayback } from './chordVisuals';
import * as btn from '@/app/platform/components/buttonStyles';

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
    /** Pins the given chord straight onto this word — the popover's own picker path,
     *  no round-trip through a canvas card. Omitted on a read-only canvas, which
     *  leaves the chord-less state rendering nothing at all. */
    onPickChord?: (symbol: string) => void;
    /** Chords already used in this song. The suggestion is drawn from these when there
     *  are any — a song reuses its own chords, so one of them is a better guess than a
     *  stranger from the palette. */
    suggestFrom?: string[];
}

export default function WordChordSection({
    symbol,
    onRemove,
    chordsHidden = false,
    onToggleChordsHidden,
    onPickChord,
    suggestFrom
}: WordChordSectionProps) {
    const { t } = useLanguage();
    const [variation, setVariation] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    // Everything this word could be given, in one list: the song's own chords first
    // (it reuses them), then the common palette. The empty state shows one of these
    // ghosted as a suggestion; clicking it turns that same display live and opens the
    // list as boxes beneath, so the writer browses shapes in place and can still go
    // straight to the chord they already had in mind.
    const browseList = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const sym of [...(suggestFrom || []), ...COMMON_CHORDS]) {
            if (sym && !seen.has(sym)) { seen.add(sym); out.push(sym); }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(suggestFrom || []).join(',')]);

    // Where the browser starts — a fresh suggestion per word, since the parent keys
    // this component by word and so remounts it for each one.
    const [browseIndex, setBrowseIndex] = useState(() => {
        const pool = (suggestFrom && suggestFrom.length > 0) ? suggestFrom : COMMON_CHORDS;
        return Math.floor(Math.random() * pool.length);
    });
    const browseSymbol = browseList[browseIndex] ?? browseList[0] ?? COMMON_CHORDS[0];
    const browsePositions = useMemo(() => chordPositions(browseSymbol), [browseSymbol]);
    /** Which fingering of the browsed chord is showing. The grid picks WHICH chord;
     *  the arrows beside play move through that chord's own shapes, the same division
     *  of labour the panel has once a chord is pinned. */
    const [browseVariation, setBrowseVariation] = useState(0);
    const browsePosition = browsePositions[browseVariation] ?? browsePositions[0];
    const browsePlayback = useChordPlayback(browsePosition);
    const stepBrowseVariation = (delta: number) => {
        if (browsePositions.length < 2) return;
        browsePlayback.stop();
        setBrowseVariation(v => ((v + delta) % browsePositions.length + browsePositions.length) % browsePositions.length);
    };
    // A different chord starts from its own first shape rather than inheriting a
    // variation number that meant something on the last one.
    useEffect(() => { setBrowseVariation(0); }, [browseSymbol]);
    // "Add chord" opens the palette right here in the panel; picking pins to the word
    // and the panel flips to showing the chord it just gained.
    const [picking, setPicking] = useState(false);
    const [customDraft, setCustomDraft] = useState('');
    const gridRef = useRef<HTMLDivElement | null>(null);

    // Open the grid looking at the chord the ghost was offering, wherever it sits in
    // the list. Written straight onto the scroller rather than via scrollIntoView,
    // which would also scroll the popover this panel lives in.
    useEffect(() => {
        if (!picking) return;
        const scroller = gridRef.current;
        const box = scroller?.querySelector<HTMLElement>('[data-browse-selected="true"]');
        if (!scroller || !box) return;
        scroller.scrollTop = box.offsetTop - scroller.clientHeight / 2 + box.offsetHeight / 2;
    }, [picking]);

    const positions = useMemo(() => chordPositions(symbol || ''), [symbol]);
    const notes = useMemo(() => chordNotes(symbol || ''), [symbol]);
    const quality = useMemo(() => chordQuality(symbol || ''), [symbol]);
    const current = positions[variation];
    const { playing, play, stop } = useChordPlayback(current);

    // A different word's chord starts from its own first voicing — and a pick that
    // just landed flips the panel from the palette to the chord it produced.
    useEffect(() => { setVariation(0); setMenuOpen(false); setPicking(false); setCustomDraft(''); stop(); }, [symbol]);

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

    /** Opens the palette. Starts it on the chord the word already has, when the word
     *  has one — changing a chord is a comparison against what is there now, so the
     *  list should open where the writer is rather than somewhere random. */
    const openPicker = () => {
        stop();
        const at = symbol ? browseList.indexOf(symbol) : -1;
        if (at >= 0) setBrowseIndex(at);
        setPicking(true);
    };

    // Picking: the whole palette laid out as boxes under a live display of whatever is
    // selected — a box says which chord, the arrows say which of its shapes, and the
    // display above follows both, so the choice is made on a fingering rather than on a
    // list of names. Everything stays in the popover, beside the word it is for.
    //
    // Reached two ways, and identical from both: a word with no chord opens it from the
    // ghosted suggestion, a word that already has one opens it from the change button.
    // Committing calls the same onPickChord either way — pinning to a word replaces
    // whatever was on it — so nothing here needs to know which case it is beyond the
    // wording of the button.
    if (picking && onPickChord) {
        const submitCustom = (e: React.FormEvent) => {
            e.preventDefault();
            if (!isValidChord(customDraft)) return;
            setPicking(false);
            onPickChord(normalizeChord(customDraft));
        };
        return (
            <div className="relative w-full md:w-[195px] md:shrink-0 self-stretch md:self-start min-h-0 overflow-y-auto md:overflow-visible no-scrollbar flex flex-col gap-3 p-4 pb-0 md:pb-4 bg-stone-50/70 rounded-[22px]">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-1 min-w-0">
                        {/* The notes sit beside the symbol below md rather than under it:
                            in the sheet's full width the line has room to spare, and
                            stacking them spent a row of height the diagram wanted. */}
                        <div className="min-w-0 flex items-baseline gap-2.5 md:block">
                            <div className="font-chords text-[25px] leading-none font-bold text-stone-900 tracking-tight shrink-0 md:truncate">{browseSymbol}</div>
                            <div className="md:mt-1.5 text-[15px] font-medium text-stone-400 truncate">
                                {chordNotes(browseSymbol).join(' · ')}
                            </div>
                        </div>
                        {/* Desktop only. In the sheet, closing is the sheet's own job —
                            its handle, its scrim and a swipe down all do it — and a second
                            X in the corner just asks which one you meant. */}
                        <button
                            type="button"
                            onClick={() => { browsePlayback.stop(); setPicking(false); }}
                            aria-label={t('common.back') || 'Back'}
                            title={t('common.back') || 'Back'}
                            className={`${btn.iconGhost('xs')} hidden md:inline-flex cursor-pointer`}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* The voicing arrows ride on the diagram itself, one at each edge
                        and level with its middle, the way a carousel puts them on the
                        thing they page. They sit in dead space: the SVG carries about
                        20px of blank margin outside the low and high strings, and the
                        tile is wider still, so nothing is covered. Dimmed rather than
                        dropped when the chord has only one shape, so the diagram does
                        not resize as you move through the grid. */}
                    {browsePosition && (
                        // No white tile behind the diagram on a phone. It was drawn to lift
                        // the shape off a 195px column of grey; in the sheet the shape is
                        // big enough to hold the eye on its own, and the tile read as an
                        // empty box with a diagram sitting in the top of it.
                        <div className="relative flex items-center justify-center bg-transparent md:bg-white rounded-[14px] py-1.5">
                            <><span className="md:hidden"><Fretboard position={browsePosition} scale={1.2} /></span><span className="hidden md:block"><Fretboard position={browsePosition} scale={0.8} /></span></>
                            {/* Given a white face and an edge on the phone: against the
                                sheet's grey these read as buttons, where a bare chevron
                                with only a hover background read as decoration. */}
                            <button
                                type="button"
                                onClick={() => stepBrowseVariation(-1)}
                                disabled={browsePositions.length < 2}
                                aria-label={t('creative.chord_prev') || 'Previous voicing'}
                                className={`${btn.plain('bare')} absolute left-0 md:left-0.5 top-1/2 h-10 w-10 -translate-y-1/2 border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors hover:text-stone-800 md:h-7 md:w-7 md:border-0 md:bg-transparent md:text-stone-400 md:shadow-none md:hover:bg-stone-100 cursor-pointer disabled:opacity-30 disabled:cursor-default`}
                            >
                                <ChevronLeft size={20} className="md:hidden" />
                                <ChevronLeft size={16} className="hidden md:block" />
                            </button>
                            <button
                                type="button"
                                onClick={() => stepBrowseVariation(1)}
                                disabled={browsePositions.length < 2}
                                aria-label={t('creative.chord_next') || 'Next voicing'}
                                className={`${btn.plain('bare')} absolute right-0 md:right-0.5 top-1/2 h-10 w-10 -translate-y-1/2 border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors hover:text-stone-800 md:h-7 md:w-7 md:border-0 md:bg-transparent md:text-stone-400 md:shadow-none md:hover:bg-stone-100 cursor-pointer disabled:opacity-30 disabled:cursor-default`}
                            >
                                <ChevronRight size={20} className="md:hidden" />
                                <ChevronRight size={16} className="hidden md:block" />
                            </button>
                        </div>
                    )}

                    {/* Play is left on its own below, centred: it acts on the shape as
                        a whole rather than moving between shapes. */}
                    <div className="flex items-center justify-center select-none">
                        <button
                            type="button"
                            onClick={() => browsePlayback.playing ? browsePlayback.stop() : browsePlayback.play()}
                            aria-label={browsePlayback.playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                            title={browsePlayback.playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                            className={`${btn.icon('sm')} cursor-pointer`}
                        >
                            {browsePlayback.playing
                                ? <Square size={11} className="fill-current" />
                                : <Play size={12} className="fill-current" />}
                        </button>
                    </div>

                    {/* Every chord at once, as boxes — this is how you say "give me
                        Bm" without walking past everything to reach it. Touching a box
                        moves the name, notes and shape above; the box is only how you
                        get there, the diagram is still what you judge. Same boxes,
                        same behaviour as the canvas chord card, in the width this
                        column has. */}
                    <div
                        ref={gridRef}
                        // Its own little scroll window on desktop, where the panel is a
                        // fixed-height column. In the sheet the palette runs at full
                        // length and the PANEL scrolls instead — which is the point of
                        // pinning the action below: the list moves, the button doesn't.
                        className="relative max-h-none overflow-visible md:max-h-[136px] md:overflow-y-auto no-scrollbar -mx-0.5 px-0.5"
                    >
                        <div className="grid grid-cols-3 gap-1.5">
                            {browseList.map((sym, i) => {
                                const isBrowsed = i === browseIndex;
                                return (
                                    <button
                                        key={sym}
                                        type="button"
                                        data-browse-selected={isBrowsed ? 'true' : undefined}
                                        onClick={() => { browsePlayback.stop(); setBrowseIndex(i); }}
                                        className={`${btn.chip(isBrowsed, 'bare')} h-11 px-2 text-[14px] font-semibold md:h-8 md:text-[11.5px] cursor-pointer`}
                                    >
                                        {sym}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* The commit action and the escape hatch beside it stay on screen while
                    the grid above scrolls under them — this panel is the scroller, so a
                    sticky direct child pins to its floor. Opaque, and stretched over the
                    panel's own padding, so chord boxes pass behind it rather than through.
                    `mt-auto` keeps it at the bottom when the content is short enough not
                    to scroll at all. */}
                <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 -mx-4 px-4 pt-3 pb-3 bg-[#FCFCFB] border-t border-stone-200/60 md:border-0 md:bg-transparent md:mx-0 md:px-0 md:pt-0 md:pb-0">
                {/* Says what it will actually do: give this word its first chord, or
                    replace the one it already has. */}
                <button
                    type="button"
                    // Closes here as well as via the symbol-changed effect: re-picking the
                    // chord the word already has leaves `symbol` untouched, and without
                    // this the picker would just sit there looking like it ignored you.
                    onClick={() => { browsePlayback.stop(); setPicking(false); onPickChord(browseSymbol); }}
                    className={`${btn.primary('bare')} h-[54px] w-full gap-2 px-4 text-[16px] font-bold md:h-10 md:gap-1.5 md:text-[13px] cursor-pointer`}
                >
                    {symbol
                        ? <ArrowUpDown size={17} className="stroke-[2.5] shrink-0 md:hidden" />
                        : <Plus size={18} className="stroke-[2.5] shrink-0 md:hidden" />}
                    {symbol
                        ? <ArrowUpDown size={14} className="stroke-[2.5] shrink-0 hidden md:block" />
                        : <Plus size={14} className="stroke-[2.5] shrink-0 hidden md:block" />}
                    <span className="truncate">
                        {symbol
                            ? (t('creative.chord_change') || 'Change chord')
                            : (t('creative.add_chord_button') || 'Add chord')}
                    </span>
                </button>

                {/* Anything outside the palette. */}
                <form onSubmit={submitCustom} className="flex gap-1.5">
                    <input
                        value={customDraft}
                        onChange={(e) => setCustomDraft(e.target.value)}
                        // A chord symbol, not prose — notation needs no translation.
                        placeholder="C#m7"
                        className="flex-1 min-w-0 h-11 md:h-8 px-3 md:px-2.5 rounded-[12px] md:rounded-[10px] bg-white border border-stone-200/70 text-[15px] md:text-[12px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                    />
                    <button
                        type="submit"
                        disabled={!isValidChord(customDraft)}
                        aria-label={t('creative.add_chord_button') || 'Add chord'}
                        className={`${btn.secondary('bare')} h-11 w-11 shrink-0 md:h-8 md:w-8 cursor-pointer disabled:opacity-35 disabled:cursor-default`}
                    >
                        <Plus size={16} className="stroke-[2.5]" />
                    </button>
                </form>
                </div>
            </div>
        );
    }

    // No chord on this word. On a read-only canvas there is nothing to offer, so
    // nothing renders and the rhymes take the full popover. When the writer CAN add
    // one, the panel shows a ghosted example chord with only the action lit — an
    // invitation, not a fake answer.
    if (!symbol) {
        if (!onPickChord) return null;

        // The ghost IS the browser's current position, voicing included — so clicking it
        // opens on exactly the shape that was being offered, and backing out of the
        // picker returns to the same one rather than snapping to the chord's first.
        const ghostPosition = browsePosition;
        return (
            <div className="relative w-full md:w-[195px] md:shrink-0 self-stretch md:self-start min-h-0 overflow-y-auto md:overflow-visible no-scrollbar flex flex-col gap-3 p-4 bg-stone-50/70 rounded-[22px]">
                {/* The suggestion IS the way in — clicking it opens the palette right here,
                    so the writer never leaves the word they are looking at. Ghosted because
                    it is an offer, not a chord this word has. */}
                <button
                    type="button"
                    onClick={openPicker}
                    aria-label={t('creative.add_chord_button') || 'Add chord'}
                    className={`${btn.plain('bare')} flex-col items-start gap-3 text-left opacity-30 transition-opacity hover:opacity-50 cursor-pointer`}
                >
                    <div className="min-w-0">
                        <div className="font-chords text-[25px] leading-none font-bold text-stone-900 tracking-tight truncate">{browseSymbol}</div>
                        <div className="mt-1.5 text-[15px] font-medium text-stone-400 truncate">
                            {chordNotes(browseSymbol).join(' · ')}
                        </div>
                    </div>
                    {/* Bigger here than anywhere else in the panel: with nothing else to
                        show, the shape IS the offer. Nearly the full width of the column —
                        the SVG runs 152px at scale 1 against 163px of room inside the
                        padding — so it is the width, not spare height, that sizes it. */}
                    {ghostPosition && (
                        <div className="flex items-center justify-center bg-white rounded-[14px] py-2">
                            <><span className="md:hidden"><Fretboard position={ghostPosition} scale={1.3} /></span><span className="hidden md:block"><Fretboard position={ghostPosition} scale={0.95} /></span></>
                        </div>
                    )}
                </button>
                {/* Sits directly under the shape it belongs to. This used to be pushed to
                    the floor with mt-auto, back when the panel stretched to the rhyme
                    list's height — the panel is self-start now, so the flow already puts
                    the action where it reads. */}
                <button
                    type="button"
                    onClick={openPicker}
                    className={`${btn.secondary('bare')} h-10 w-full gap-1.5 px-4 text-[13px] font-bold cursor-pointer`}
                >
                    <Plus size={14} className="stroke-[2.5]" />
                    {t('creative.add_chord_button') || 'Add chord'}
                </button>
            </div>
        );
    }

    return (
        // Full width on a phone: this is a 195px column because on desktop it sits
        // beside the word list, but in the mobile sheet it is the whole Chords tab
        // and a fixed narrow column left half the sheet empty.
        <div className="relative w-full md:w-[195px] md:shrink-0 self-stretch md:self-start min-h-0 overflow-y-auto md:overflow-visible no-scrollbar flex flex-col gap-3 p-4 bg-stone-50/70 rounded-[22px]">
            {/* The chord's own actions live in a menu beside its name, where the thing
                they act on is. The remove action used to sit as a bare bin next to the
                voicing pager — two unrelated controls sharing a row, with the destructive
                one the easiest to hit by accident while stepping through voicings. */}
            <div className="flex items-start justify-between gap-1 min-w-0">
                <div className="min-w-0">
                    <div className="font-chords text-[25px] leading-none font-bold text-stone-900 tracking-tight truncate">{symbol}</div>
                    <div className="mt-1.5 text-[15px] font-medium text-stone-400 truncate">
                        {[quality, notes.join(' · ')].filter(Boolean).join(' — ')}
                    </div>
                </div>

                {(onRemove || onToggleChordsHidden) && (
                    // Below md this is lifted out of the header and dropped into the
                    // action row at the bottom, so play / swap / menu read as one group.
                    // `order` can't do it — the header is a different flex container —
                    // so it is absolutely positioned into that row instead, and the row
                    // reserves a matching 47px gap for it to land in.
                    <div
                        className="absolute md:static right-4 bottom-4 md:right-auto md:bottom-auto shrink-0 z-10 md:z-auto"
                        ref={menuRef}
                    >
                        <button
                            type="button"
                            onClick={() => setMenuOpen(open => !open)}
                            aria-label={t('creative.chord_options') || 'Chord options'}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className={`${btn.plain('bare')} h-[47px] w-[47px] border border-stone-200 bg-white shadow-sm transition-colors md:-mr-1.5 md:h-9 md:w-9 md:border-0 md:bg-transparent md:shadow-none cursor-pointer ${
                                menuOpen ? 'text-stone-800 md:bg-stone-200/70' : 'text-stone-500 hover:text-stone-800 md:text-stone-400 md:hover:bg-stone-200/60'
                            }`}
                        >
                            <MoreVertical size={19} />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                // Opens upward on the phone, where the trigger sits at the
                                // bottom of the card and a downward menu would fall off it.
                                className="absolute right-0 bottom-[55px] md:bottom-auto md:top-10 z-40 w-[168px] bg-white border border-stone-200/80 rounded-[14px] shadow-[0_8px_25px_rgba(0,0,0,0.08)] p-1"
                            >
                                {/* Canvas-wide, not per-chord: this turns every chord symbol
                                    above the lyrics on or off, for reading the words clean. */}
                                {onToggleChordsHidden && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => { setMenuOpen(false); onToggleChordsHidden(); }}
                                        className={`${btn.plain('bare')} w-full justify-start gap-2 rounded-[10px] px-3 py-2 text-left text-[12px] font-semibold text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900 cursor-pointer`}
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
                                        className={`${btn.plain('bare')} w-full justify-start gap-2 rounded-[10px] px-3 py-2 text-left text-[12px] font-semibold text-red-500 transition-all hover:bg-red-50 hover:text-red-600 cursor-pointer`}
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
                <div className="flex items-center justify-center bg-white rounded-[18px] py-4 md:py-2">
                    {/* Bigger on the phone, where the sheet gives it the width the
                        desktop column never had. */}
                    <span className="md:hidden"><Fretboard position={current} scale={1.25} /></span>
                    <span className="hidden md:block"><Fretboard position={current} scale={0.81} /></span>
                </div>
            )}

            {/* On the phone the order is visual → stepper → buttons: the stepper
                belongs to the diagram it pages through, and the three actions read as
                one group when they sit together at the bottom. flex-col-reverse swaps
                the two child rows below md without moving them in the DOM. */}
            <div className="flex flex-col-reverse md:flex-col gap-2">
                    {/* Hearing the chord and swapping it are the two things a writer does
                        with a chord that is already placed, so they share the row as a
                        matched pair of squares. Both icon-only: a play triangle and a
                        two-way arrow need no caption, and the label was the only thing
                        making the row's two halves different sizes. */}
                    {/* pr on the phone reserves the 47px the absolutely-positioned menu
                        button occupies at this row's right end, so play and swap centre
                        against the space that is actually left rather than sliding under it. */}
                    <div className="flex items-center justify-center gap-2 pr-[55px] md:pr-0">
                    {current ? (
                        <button
                            type="button"
                            onClick={playing ? stop : play}
                            aria-label={playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                            title={playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                            className={`${btn.secondary('bare')} h-[47px] w-[47px] shrink-0 text-stone-800 cursor-pointer`}
                        >
                            {playing
                                ? <Square size={14} className="fill-current" />
                                : <Play size={16} className="fill-current" />}
                        </button>
                    ) : (
                        <span className="flex-1 min-w-0 text-[15px] font-medium text-stone-400">
                            {t('creative.chord_no_diagram') || 'No guitar shape for this chord yet.'}
                        </span>
                    )}
                    {onPickChord && (
                        <button
                            type="button"
                            onClick={openPicker}
                            aria-label={t('creative.chord_change') || 'Change chord'}
                            title={t('creative.chord_change') || 'Change chord'}
                            className={`${btn.secondary('bare')} h-[47px] w-[47px] shrink-0 cursor-pointer`}
                        >
                            <ArrowUpDown size={16} />
                        </button>
                    )}
                    </div>

                    {/* Just the voicing pager now, so it centres instead of being pushed
                        left by a control that no longer shares the row. */}
                    <div className="flex items-center justify-center">
                    {positions.length > 1 && (
                        <div className="flex items-center gap-0.5 select-none">
                            <button
                                type="button"
                                onClick={() => goTo(variation - 1)}
                                aria-label={t('creative.chord_prev') || 'Previous voicing'}
                                className={`${btn.iconGhost('sm')} cursor-pointer`}
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
                                className={`${btn.iconGhost('sm')} cursor-pointer`}
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
