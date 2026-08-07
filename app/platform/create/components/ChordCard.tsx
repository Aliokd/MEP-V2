'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, X, ChevronLeft, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { COMMON_CHORDS, chordPositions, chordNotes, isValidChord, normalizeChord, type ChordMark } from '@/lib/chords';
import { Fretboard, useChordPlayback } from './chordVisuals';

/**
 * A chord the writer has added but not yet placed — the chord equivalent of the
 * image and audio cards, and like them it arrives the moment you ask for it rather
 * than after a menu of choices.
 *
 * The card is one container holding a map: every chord is a box you drag around to
 * explore, and the one you choose pans to the middle and opens there to show its
 * shape and play it. Clicking it again shrinks it back onto the map — choosing
 * shouldn't cost you your place in the list, which is what a menu that closes on
 * selection does.
 *
 * The two things that would otherwise need chrome live inside the map instead: the
 * last box opens a field for anything outside the palette, and removing the card is
 * a corner button that only appears on hover. Attaching a chord to a word is a drag
 * from the opened panel — the map's own drag gesture is panning.
 */

// Grid geometry. The viewport is deliberately not a whole number of cells in
// either direction, so a half-visible row and column always sit at the edge.
const COLS = 6;
const CELL_W = 64;
const CELL_H = 52;
const GAP = 8;
const GRID_PAD = 8;
const VIEW_H = 190;
/** Rings of empty boxes around the chords. They make the map feel like a surface
 *  rather than a list that stops, and — the practical reason — they give every real
 *  box enough room beyond it to actually reach the middle instead of the scroll
 *  clamping short at the edges. Sized to just over half a viewport each way. */
const PAD_COLS = 3;
const PAD_ROWS = 2;
/** Expand/collapse duration. Matches the pan, so the box arriving in the middle
 *  and the box opening are one movement rather than two. */
const TRANSITION_MS = 300;
/** Pointer travel before a press counts as a pan rather than a click. */
const PAN_THRESHOLD = 4;
/** How long a box has to be held still before it lifts out of the map, ready to be
 *  dropped on a word. Long enough not to fire on the way into a pan, short enough
 *  not to feel like waiting. */
const HOLD_MS = 320;

type Panel = 'none' | 'chord' | 'input';

export interface ChordCardProps {
    chord: ChordMark;
    onSetSymbol: (symbol: string) => void;
    onRemove: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging?: boolean;
}

export default function ChordCard({ chord, onSetSymbol, onRemove, onDragStart, onDragEnd, isDragging }: ChordCardProps) {
    const { t } = useLanguage();
    const [variation, setVariation] = useState(0);
    const [draft, setDraft] = useState('');
    const [panel, setPanel] = useState<Panel>('none');
    /** Which box the panel grew out of, so it can shrink back into it. */
    const [openFrom, setOpenFrom] = useState<number | null>(null);
    // Chords typed into the field join the map, so anything the writer reaches for
    // once stays reachable without typing it again.
    const [extraChords, setExtraChords] = useState<string[]>([]);

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const chordList = useMemo(() => {
        const list = [...COMMON_CHORDS as readonly string[]];
        // A chord already on this card that isn't in the palette belongs on the map too.
        [...extraChords, chord.symbol].forEach(s => {
            if (s && !list.includes(s)) list.push(s);
        });
        return list;
    }, [extraChords, chord.symbol]);

    /** Every box the map can open, chords then the "other chord" field. */
    const itemCount = chordList.length + 1;
    const inputIndex = chordList.length;
    const realRows = Math.ceil(itemCount / COLS);
    const totalCols = COLS + PAD_COLS * 2;
    const totalRows = realRows + PAD_ROWS * 2;

    const positions = useMemo(() => chordPositions(chord.symbol), [chord.symbol]);
    const notes = useMemo(() => chordNotes(chord.symbol), [chord.symbol]);
    const current = positions[variation];
    const { playing, play, stop } = useChordPlayback(current);

    /** Pans the map so a box sits in the middle, the way clicking a place on a map
     *  recentres it. The filler rings mean this lands exactly, edges included. */
    const centerCell = (itemIndex: number) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const col = PAD_COLS + (itemIndex % COLS);
        const row = PAD_ROWS + Math.floor(itemIndex / COLS);
        scroller.scrollTo({
            left: GRID_PAD + col * (CELL_W + GAP) + CELL_W / 2 - scroller.clientWidth / 2,
            top: GRID_PAD + row * (CELL_H + GAP) + CELL_H / 2 - scroller.clientHeight / 2,
            behavior: 'smooth',
        });
    };

    /** The transform that puts the panel exactly over one box, at that box's size.
     *  Both ends of the open and close animations are this or identity. */
    const transformOverCell = (itemIndex: number): string | null => {
        const panelEl = panelRef.current;
        const cellEl = scrollerRef.current?.querySelector<HTMLElement>(`[data-chord-index="${itemIndex}"]`);
        if (!panelEl || !cellEl) return null;

        // Measure the panel as if it had no transform. getBoundingClientRect reports
        // the *transformed* box, so closing while the opening animation is still
        // running would divide by an already-shrunken width and send the panel
        // somewhere arbitrary. Clearing the transition too stops this measurement
        // from animating; nothing paints between the two assignments.
        const prevTransition = panelEl.style.transition;
        const prevTransform = panelEl.style.transform;
        panelEl.style.transition = 'none';
        panelEl.style.transform = 'none';
        const p = panelEl.getBoundingClientRect();
        panelEl.style.transform = prevTransform;
        panelEl.style.transition = prevTransition;

        const c = cellEl.getBoundingClientRect();
        if (!p.width || !p.height) return null;
        // Scale is measured, not guessed, so the panel meets the box at its real
        // size whatever the card is doing at that moment.
        const sx = c.width / p.width;
        const sy = c.height / p.height;
        // transform-origin is the centre, so bring the two centres together.
        const dx = (c.left + c.width / 2) - (p.left + p.width / 2);
        const dy = (c.top + c.height / 2) - (p.top + p.height / 2);
        return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    };

    // Grow out of the box that was clicked. Runs before paint, so the collapsed
    // start state is never visible as a frame at full size.
    useLayoutEffect(() => {
        if (panel === 'none' || openFrom === null) return;
        const el = panelRef.current;
        if (!el) return;
        const from = transformOverCell(openFrom);
        if (!from) return;
        el.style.transition = 'none';
        el.style.transform = from;
        el.style.opacity = '0';
        // Force the browser to accept the start state before switching to the end
        // one — without this the two collapse into a single style change and nothing
        // animates at all.
        void el.offsetHeight;
        el.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${TRANSITION_MS}ms ease-out`;
        el.style.transform = 'translate(0px, 0px) scale(1)';
        el.style.opacity = '1';
    }, [panel, openFrom]);

    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    /** Shrinks back into its box, then unmounts. */
    const closePanel = () => {
        stop();
        const el = panelRef.current;
        if (!el || openFrom === null) { setPanel('none'); return; }
        const to = transformOverCell(openFrom);
        if (!to) { setPanel('none'); return; }
        el.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${TRANSITION_MS}ms ease-in`;
        el.style.transform = to;
        el.style.opacity = '0';
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setPanel('none'), TRANSITION_MS);
    };

    const openPanel = (mode: Panel, itemIndex: number) => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpenFrom(itemIndex);
        setPanel(mode);
        centerCell(itemIndex);
    };

    const choose = (symbol: string, itemIndex: number) => {
        if (!isValidChord(symbol)) return null;
        stop();
        const normalized = normalizeChord(symbol);
        setVariation(0);
        onSetSymbol(normalized);
        openPanel('chord', itemIndex);
        return normalized;
    };

    const submitDraft = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidChord(draft)) return;
        const normalized = normalizeChord(draft);
        const existing = chordList.indexOf(normalized);
        // A typed chord that isn't on the map yet takes the slot the field occupied,
        // which pushes the field one box along.
        const itemIndex = existing >= 0 ? existing : chordList.length;
        setExtraChords(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
        setVariation(0);
        onSetSymbol(normalized);
        setDraft('');
        openPanel('chord', itemIndex);
    };

    const goTo = (next: number) => {
        stop();
        setVariation(((next % positions.length) + positions.length) % positions.length);
    };

    // Click away to shrink the panel back onto the map. Boxes are excluded so moving
    // straight from one chord to another doesn't collapse and reopen on the way.
    useEffect(() => {
        if (panel === 'none') return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target?.closest('.chord-expanded-panel') || target?.closest('.chord-grid-cell')) return;
            closePanel();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [panel, openFrom]);

    // The map opens looking at the chords, not at the empty filler in its top-left
    // corner. Instant rather than animated: this is where the map starts, not
    // somewhere it travelled to.
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const blockLeft = GRID_PAD + PAD_COLS * (CELL_W + GAP);
        const blockWidth = COLS * CELL_W + (COLS - 1) * GAP;
        const blockTop = GRID_PAD + PAD_ROWS * (CELL_H + GAP);
        const blockHeight = realRows * CELL_H + (realRows - 1) * GAP;
        scroller.scrollLeft = blockLeft + blockWidth / 2 - scroller.clientWidth / 2;
        scroller.scrollTop = blockTop + blockHeight / 2 - scroller.clientHeight / 2;
        // Mount only. Re-centring when the row count changes would yank the map out
        // from under someone who had scrolled somewhere deliberately.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Drag to pan, hold to lift ────────────────────────────────────────────
    // Mouse only: touch already pans the scroll container natively, and taking the
    // gesture over would cost momentum scrolling for nothing.
    //
    // One press has to serve two purposes, so the hold is what tells them apart:
    // move straight away and you're panning the map, hold still for a moment and
    // the box under the pointer lifts out to be dropped on a word.
    const pan = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
    const panned = useRef(false);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [liftedIndex, setLiftedIndex] = useState<number | null>(null);

    const cancelHold = () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = null;
    };

    useEffect(() => cancelHold, []);

    /** Starts the press-and-hold that lifts one chord box out of the map. */
    const beginHold = (itemIndex: number, e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        cancelHold();
        holdTimer.current = setTimeout(() => {
            setLiftedIndex(itemIndex);
            // This press belongs to the drag now, so it must not also pan.
            pan.current = null;
        }, HOLD_MS);
    };

    const onPointerDown = (e: React.PointerEvent) => {
        const scroller = scrollerRef.current;
        if (!scroller || e.pointerType !== 'mouse' || e.button !== 0) return;
        panned.current = false;
        pan.current = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop, moved: false };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const state = pan.current;
        const scroller = scrollerRef.current;
        if (!state || !scroller) return;
        const dx = e.clientX - state.x;
        const dy = e.clientY - state.y;
        if (!state.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        // Moving this early means the press was a pan, not a hold.
        cancelHold();
        if (!state.moved) {
            state.moved = true;
            // Capture so the map keeps following the pointer past its own edges.
            try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
        }
        scroller.scrollLeft = state.left - dx;
        scroller.scrollTop = state.top - dy;
    };

    const endPan = (e: React.PointerEvent) => {
        cancelHold();
        // A hold that never became a drag just puts the box back down.
        setLiftedIndex(null);
        // Remembered until the click that follows, so a pan doesn't also pick a chord.
        panned.current = !!pan.current?.moved;
        if (pan.current?.moved) {
            try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* never captured */ }
        }
        pan.current = null;
    };

    const onPointerCancel = () => {
        cancelHold();
        // Deliberately leaves the box lifted. The browser fires pointercancel at the
        // exact moment a native drag takes over, and putting the box down here would
        // switch off the `draggable` that the hold just turned on — cancelling the
        // drag the gesture existed to start. Landing or aborting the drag is what
        // puts it back down, via onDragEnd.
        panned.current = !!pan.current?.moved;
        pan.current = null;
    };

    // Only a chord that exists can be attached to a word.
    const draggable = !!chord.symbol;
    const startDrag = (e: React.DragEvent) => {
        if (!draggable) { e.preventDefault(); return; }
        stop();
        onDragStart(e);
    };

    // transform is in the transition list so the hold visibly lifts the box rather
    // than snapping it larger.
    const cellBase = 'chord-grid-cell rounded-[12px] text-[12.5px] font-semibold flex items-center justify-center border transition-[background-color,border-color,color,box-shadow,transform] duration-150';

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            // Mousedown too, not just click: the canvas starts a text selection from a
            // bare press, and panning the map would otherwise drag-select the lyric
            // behind it. Matches how the other in-canvas overlays here behave.
            onMouseDown={(e) => e.stopPropagation()}
            className={`chord-card group/card relative w-[380px] max-w-full bg-white border border-stone-200 rounded-[20px] shadow-2xs transition-colors ${
                isDragging ? 'opacity-30' : 'hover:border-stone-300'
            }`}
        >
            {/* Removing the card. Hidden until the card is hovered so it isn't a
                permanent piece of furniture on a card that is otherwise just a map. */}
            <button
                type="button"
                onClick={() => { stop(); onRemove(); }}
                aria-label={t('creative.chord_remove') || 'Remove chord'}
                title={t('creative.chord_remove') || 'Remove chord'}
                className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-white border border-stone-200 shadow-2xs flex items-center justify-center text-stone-400 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
            >
                <X size={13} className="stroke-[2.5]" />
            </button>

            <div className="relative">
                <div
                    ref={scrollerRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endPan}
                    onPointerCancel={onPointerCancel}
                    // The vignette: the map fades out towards the edges instead of
                    // stopping at a hard line, which keeps the eye on the middle —
                    // where the box you pick opens. A mask rather than an overlay, so
                    // it fades whatever is behind rather than painting a colour over it.
                    style={{
                        height: VIEW_H,
                        maskImage: 'radial-gradient(ellipse 78% 78% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 76%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 78% 78% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 76%, transparent 100%)',
                    }}
                    className="overflow-auto no-scrollbar rounded-[20px] cursor-grab active:cursor-grabbing select-none"
                >
                    <div
                        className="grid"
                        style={{ gridTemplateColumns: `repeat(${totalCols}, ${CELL_W}px)`, gap: GAP, padding: GRID_PAD, width: 'max-content' }}
                    >
                        {Array.from({ length: totalRows * totalCols }).map((_, slot) => {
                            const row = Math.floor(slot / totalCols);
                            const col = slot % totalCols;
                            const inBlock =
                                row >= PAD_ROWS && row < PAD_ROWS + realRows &&
                                col >= PAD_COLS && col < PAD_COLS + COLS;
                            const itemIndex = inBlock ? (row - PAD_ROWS) * COLS + (col - PAD_COLS) : -1;

                            // Filler. Inert and unlabelled — it's the surface the chords
                            // sit on, not something you can pick.
                            if (itemIndex < 0 || itemIndex >= itemCount) {
                                return (
                                    <div
                                        key={slot}
                                        aria-hidden="true"
                                        style={{ width: CELL_W, height: CELL_H }}
                                        className="rounded-[12px] bg-stone-100/70 border border-stone-100"
                                    />
                                );
                            }

                            if (itemIndex === inputIndex) {
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        data-chord-index={itemIndex}
                                        onClick={() => {
                                            if (panned.current) return;
                                            if (panel === 'input') { closePanel(); return; }
                                            stop();
                                            openPanel('input', itemIndex);
                                        }}
                                        aria-label={t('creative.chord_placeholder') || 'Other chord'}
                                        title={t('creative.chord_placeholder') || 'Other chord'}
                                        style={{ width: CELL_W, height: CELL_H }}
                                        className={`${cellBase} border-dashed border-stone-300 text-stone-400 bg-white/70 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer`}
                                    >
                                        <Plus size={16} className="stroke-[2.5]" />
                                    </button>
                                );
                            }

                            const symbol = chordList[itemIndex];
                            const isSelected = chord.symbol === symbol;
                            const isLifted = liftedIndex === itemIndex;
                            return (
                                <button
                                    key={slot}
                                    type="button"
                                    data-chord-index={itemIndex}
                                    // Hold this box and it lifts out of the map, ready to be
                                    // dropped straight onto a word — no need to open it first.
                                    onPointerDown={(e) => beginHold(itemIndex, e)}
                                    draggable={isLifted}
                                    onDragStart={(e) => {
                                        if (!isLifted) { e.preventDefault(); return; }
                                        stop();
                                        // The card carries one chord, and this is now it — set
                                        // before the drop so the word it lands on pins this
                                        // symbol rather than whatever was chosen previously.
                                        onSetSymbol(symbol);
                                        onDragStart(e);
                                    }}
                                    onDragEnd={() => { setLiftedIndex(null); onDragEnd(); }}
                                    onClick={() => {
                                        // A pan that ended on this box isn't a pick.
                                        if (panned.current) return;
                                        // Clicking the open chord's own box closes it, the
                                        // same way clicking the opened panel does.
                                        if (isSelected && panel === 'chord') { closePanel(); return; }
                                        choose(symbol, itemIndex);
                                    }}
                                    style={{ width: CELL_W, height: CELL_H }}
                                    className={`${cellBase} ${isLifted ? 'cursor-grabbing scale-110 shadow-lg ring-2 ring-indigo-400 z-10 relative' : 'cursor-pointer'} ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-stone-600 border-stone-200/70 hover:border-indigo-300 hover:text-indigo-700 hover:shadow-2xs'
                                    }`}
                                >
                                    {symbol}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {panel !== 'none' && (
                    // pointer-events-none on the layer, auto on the panel: the map
                    // showing around the opened box stays pannable, and a press on it
                    // lands on the map rather than on an invisible sheet.
                    <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
                        <div
                            ref={panelRef}
                            draggable={panel === 'chord' && draggable}
                            onDragStart={panel === 'chord' ? startDrag : undefined}
                            onDragEnd={panel === 'chord' ? onDragEnd : undefined}
                            onClick={(e) => {
                                // Clicking the panel itself minimises it; its controls don't.
                                if ((e.target as HTMLElement).closest('button, input, form')) return;
                                closePanel();
                            }}
                            style={{ willChange: 'transform, opacity' }}
                            className="chord-expanded-panel relative pointer-events-auto w-full bg-white border border-stone-200/80 rounded-[16px] shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-3 flex gap-3 cursor-pointer"
                        >
                            {/* The handle for dragging this chord onto a word. Floated into
                                the panel's top-right corner rather than sitting beside the
                                symbol, so it reads as a control on the panel instead of
                                punctuation in front of the chord name. */}
                            {panel === 'chord' && draggable && (
                                <div
                                    aria-hidden="true"
                                    title={t('creative.drag_chord_hint') || 'Drag onto a word'}
                                    className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-white border border-stone-200/70 shadow-2xs flex items-center justify-center text-stone-400"
                                >
                                    <GripVertical size={12} />
                                </div>
                            )}
                            {panel === 'input' ? (
                                <form onSubmit={submitDraft} className="flex-1 flex flex-col justify-center gap-2 py-2">
                                    <input
                                        autoFocus
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={t('creative.chord_placeholder') || 'Other chord, e.g. F#m7b5'}
                                        className="w-full h-10 px-3 rounded-[12px] bg-stone-50 border border-stone-200/70 text-[13px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-indigo-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!isValidChord(draft)}
                                        className={`w-full h-9 rounded-[12px] text-[12.5px] font-bold transition-colors ${
                                            isValidChord(draft)
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer active:scale-[0.98]'
                                                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {t('common.add') || 'Add'}
                                    </button>
                                </form>
                            ) : current ? (
                                // Name and controls read first on the left, the shape sits on
                                // the right where the eye lands last.
                                <>
                                    <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                                        <div className="min-w-0 pr-7">
                                            <div className="text-[20px] leading-none font-bold text-stone-900 tracking-tight truncate">{chord.symbol}</div>
                                            <div className="mt-1 text-[11px] font-medium text-stone-400 truncate">{notes.join(' · ')}</div>
                                        </div>

                                        {positions.length > 1 && (
                                            <div className="flex items-center justify-between select-none">
                                                <button
                                                    type="button"
                                                    onClick={() => goTo(variation - 1)}
                                                    aria-label={t('creative.chord_prev') || 'Previous voicing'}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer active:scale-95"
                                                >
                                                    <ChevronLeft size={15} />
                                                </button>
                                                <span className="text-[11.5px] font-semibold text-stone-400 tabular-nums">
                                                    {variation + 1} / {positions.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => goTo(variation + 1)}
                                                    aria-label={t('creative.chord_next') || 'Next voicing'}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer active:scale-95"
                                                >
                                                    <ChevronRight size={15} />
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={playing ? stop : play}
                                            className="w-full h-9 rounded-[12px] bg-white border border-stone-200 shadow-sm hover:shadow hover:border-stone-300 text-stone-800 text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                                        >
                                            {playing ? <Square size={12} className="fill-current" /> : <Play size={13} className="fill-current" />}
                                            {playing ? (t('creative.chord_stop') || 'Stop') : (t('creative.chord_play') || 'Play chord')}
                                        </button>
                                    </div>

                                    {/* Extra padding on the right keeps the high-E string's open
                                        or muted marker clear of the drag handle floating in the
                                        corner above it. */}
                                    <div className="flex items-center justify-center bg-stone-50/70 rounded-[12px] pl-1 pr-3 shrink-0">
                                        <Fretboard position={current} scale={0.8} />
                                    </div>
                                </>
                            ) : (
                                // A real chord with no guitar shape in the database. It can
                                // still be pinned to a word, so say what's missing rather
                                // than showing an empty box.
                                <div className="flex-1 py-6 text-center">
                                    <div className="text-[18px] font-bold text-stone-900">{chord.symbol}</div>
                                    <div className="mt-2 text-[12px] text-stone-400 font-medium leading-relaxed">
                                        {t('creative.chord_no_diagram') || 'No guitar shape for this chord yet.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
